// The weekly backup (ticket #22, design 12.6): every table of every user, in one file.
// Relative imports with .ts let `scripts/backup.mjs` run this file in Node.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { selectAll } from "../select-all.ts";

/**
 * Every public table the backup holds, in the order a restore inserts them.
 * allowed_emails and profiles come first: every event needs a profile to exist.
 * review_state is a cache of the log: the restore rebuilds it and checks it against this copy.
 */
export const BACKUP_TABLES = [
  "allowed_emails",
  "profiles",
  "session_events",
  "catch_events",
  "review_events",
  "placement_events",
  "battle_turn_events",
  "battle_events",
  "content_reports",
  "push_subscriptions",
  "reminders",
  "review_state",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Tables the backup leaves out on purpose, and why. */
export const NOT_BACKED_UP: Record<string, string> = {
  backups: "It only records which backups hold a learner. A restored database starts its own list.",
};

/** The secrets the weekly job needs. Without all three it stops before it reads anything. */
export const BACKUP_SECRETS = ["PRODUCTION_SUPABASE_URL", "PRODUCTION_SUPABASE_SECRET_KEY", "BACKUP_ENCRYPTION_KEY"] as const;

export function missingBackupSecrets(env: Record<string, string | undefined>): string[] {
  return BACKUP_SECRETS.filter((name) => !env[name]?.trim());
}

const FILE_NAME = /^backup-\d{4}-\d{2}-\d{2}T\d{6}Z\.tltb$/;

/** For example backup-2026-10-25T200007Z.tltb: the UTC time, so names sort by date. */
export function backupFileName(at: Date): string {
  const stamp = at.toISOString().slice(0, 19).replace(/:/g, "");
  return `backup-${stamp}Z.tltb`;
}

export function isBackupFileName(name: string): boolean {
  return FILE_NAME.test(name);
}

/** Raise this when the shape of the file changes, so a restore knows how to read an old file. */
export const BACKUP_SCHEMA_VERSION = 1;

export type Row = Record<string, unknown>;

/** The part of a sign-in account a restore needs. */
export type BackupUser = {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
};

export type Backup = {
  kind: "tech-lead-trainer-backup";
  schemaVersion: number;
  createdAt: string;
  users: BackupUser[];
  /** Every row of every backup table, as stored, keyed by table name. */
  tables: Record<BackupTable, Row[]>;
};

/** Each table is read in a fixed order, so pages never skip or repeat a row. */
const READ_ORDER: Record<BackupTable, string[]> = {
  allowed_emails: ["email"],
  profiles: ["user_id"],
  review_state: ["user_id", "item_id"],
  session_events: ["id"],
  catch_events: ["id"],
  review_events: ["id"],
  placement_events: ["id"],
  battle_turn_events: ["id"],
  battle_events: ["id"],
  content_reports: ["id"],
  push_subscriptions: ["id"],
  reminders: ["id"],
};

async function readUsers(client: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

function readTable(client: SupabaseClient, table: BackupTable, userIds?: string[]): Promise<Row[]> {
  return selectAll((from, to) => {
    let query = client.from(table).select("*");
    if (userIds && table !== "allowed_emails") query = query.in("user_id", userIds);
    for (const column of READ_ORDER[table]) query = query.order(column);
    return query.range(from, to).returns<Row[]>();
  });
}

/**
 * Reads every table with the secret key, which skips row-level security.
 * `userIds` keeps only those users: tests use it on the shared local database.
 *
 * The tables are read first and the accounts last. A user deleted during the backup is then
 * missing from the accounts, and their rows are dropped, so a restore never fails on them.
 *
 * The API cannot read all tables in one snapshot. A learner who studies while the backup runs
 * can make review_state and the log disagree by one item. The job runs at 03:00 home time, so
 * this is rare, and the restore check names any such item.
 */
export async function readBackup(
  client: SupabaseClient,
  { userIds, now = new Date() }: { userIds?: string[]; now?: Date } = {},
): Promise<Backup> {
  const read = await Promise.all(BACKUP_TABLES.map((table) => readTable(client, table, userIds)));
  const accounts = (await readUsers(client)).filter((user) => !userIds || userIds.includes(user.id));
  const known = new Set(accounts.map((user) => user.id));
  const emails = new Set(accounts.map((user) => user.email?.toLowerCase()));

  const tables = Object.fromEntries(
    BACKUP_TABLES.map((table, i) => {
      const rows =
        table === "allowed_emails"
          ? read[i].filter((row) => !userIds || emails.has(String(row.email)))
          : read[i].filter((row) => known.has(String(row.user_id)));
      return [table, rows];
    }),
  ) as Record<BackupTable, Row[]>;

  return {
    kind: "tech-lead-trainer-backup",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    users: accounts.map((user) => ({
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at ?? null,
      banned_until: user.banned_until ?? null,
    })),
    tables,
  };
}

/**
 * Records a stored backup. The weekly job calls it last, after the file is safely stored,
 * so a failed week never moves the "Last backup" date.
 */
export async function recordBackup(
  admin: SupabaseClient,
  { fileName, userIds, finishedAt = new Date() }: { fileName: string; userIds: string[]; finishedAt?: Date },
): Promise<void> {
  if (!isBackupFileName(fileName)) throw new Error(`Not a backup file name: ${fileName}`);
  // One row per learner: an account deleted after the export must not stop the others.
  for (const userId of userIds) {
    const { error } = await admin
      .from("backups")
      .insert({ user_id: userId, file_name: fileName, finished_at: finishedAt.toISOString() });
    // 23503: the account is gone. Its data went with it, so it needs no date.
    if (error && error.code !== "23503") throw error;
  }
}
