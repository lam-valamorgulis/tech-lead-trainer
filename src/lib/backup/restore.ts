// Restores a weekly backup into an empty database (ticket #22, design 12.6).
// It talks to Postgres directly, as the table owner `postgres`, in one transaction:
// a failure leaves the database as empty as it was.
// Relative imports with .ts let `scripts/backup.mjs` run this file in Node.
import {
  reviewStateRows,
  type BattleCheckRow,
  type BattleEndRow,
  type BattleTurnRow,
  type CatchRow,
  type PlacementRow,
  type ReviewRow,
  type StateRow,
} from "../review-state.ts";
import { BACKUP_SCHEMA_VERSION, BACKUP_TABLES, type Backup, type BackupTable, type Row } from "./backup.ts";

/** The one method of a `pg` client the restore uses. */
export type Database = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export type RestoreReport = {
  users: number;
  rows: Record<BackupTable, number>;
  /** Items where the state rebuilt from the log is not the state in the file. Empty is good. */
  reviewStateDifferences: string[];
};

const COLUMN = /^[a-z_][a-z0-9_]*$/;

/** Sign-in accounts look as if GoTrue made them, so the email sign-in works on the copy. */
const INSERT_USERS = `
  insert into auth.users (
    instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at, banned_until,
    raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current, reauthentication_token,
    phone_change, phone_change_token
  )
  select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
    u.email_confirmed_at, u.created_at, now(), u.banned_until,
    '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', '', '', '', '', '', '', '', ''
  from jsonb_to_recordset($1::jsonb)
    as u (id uuid, email text, created_at timestamptz, email_confirmed_at timestamptz, banned_until timestamptz)`;

const INSERT_IDENTITIES = `
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  select u.id::text, u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
    'email', u.created_at, now()
  from jsonb_to_recordset($1::jsonb) as u (id uuid, email text, created_at timestamptz)`;

async function count(db: Database, table: string): Promise<number> {
  return Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n);
}

async function assertEmpty(db: Database): Promise<void> {
  for (const table of ["auth.users", ...BACKUP_TABLES.map((name) => `public.${name}`)]) {
    const rows = await count(db, table);
    if (rows > 0) {
      throw new Error(`The target database is not empty: ${table} has ${rows} row(s). A restore only goes into an empty database.`);
    }
  }
}

/**
 * Inserts rows exactly as stored: ids, learning days and recorded times stay the same.
 * The table's own triggers are off during the insert, because they would recompute the
 * learning day from today's home time zone. Turning them off is part of the transaction.
 */
async function insertRows(db: Database, table: BackupTable, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const bad = columns.find((column) => !COLUMN.test(column));
  if (bad) throw new Error(`The backup has a column name that is not allowed: ${table}.${bad}`);
  const list = columns.map((column) => `"${column}"`).join(", ");
  await db.query(`alter table public.${table} disable trigger user`);
  await db.query(
    `insert into public.${table} (${list}) overriding system value
     select ${list} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`,
    [JSON.stringify(rows)],
  );
  await db.query(`alter table public.${table} enable trigger user`);
  if (columns.includes("id")) {
    // The next new row continues after the restored ids.
    await db.query(`select setval(pg_get_serial_sequence('public.${table}', 'id'), (select max(id) from public.${table}))`);
  }
}

/** The review state of one user, rebuilt from the log now in the database (design 12.2). */
async function rebuildFromLog(db: Database, userId: string): Promise<StateRow[]> {
  // The same text forms and the same order as the API gives `rebuildReviewState`.
  const occurredAtText = "to_jsonb(occurred_at) #>> '{}' as occurred_at";
  const learningDayText = "learning_day::text as learning_day";
  const oneUserInTimeOrder = "where user_id = $1 order by occurred_at, id";
  const placements = await db.query(
    `select town_id, item_id, correct, ${learningDayText}, ${occurredAtText} from public.placement_events ${oneUserInTimeOrder}`,
    [userId],
  );
  const catches = await db.query(
    `select item_id, correct, ${learningDayText}, ${occurredAtText} from public.catch_events ${oneUserInTimeOrder}`,
    [userId],
  );
  const reviews = await db.query(`select item_id, ${learningDayText}, grade from public.review_events ${oneUserInTimeOrder}`, [userId]);
  const battleTurns = await db.query("select battle_id, move_id from public.battle_turn_events where user_id = $1 order by id", [userId]);
  const battleEnds = await db.query(
    `select battle_id, result, ${learningDayText} from public.battle_events where user_id = $1 and result = 'lost' order by id`,
    [userId],
  );
  const battleChecks = await db.query(
    `select battle_id, turn_number, best_move_id, ticked_points, ${learningDayText} from public.battle_check_events where user_id = $1 order by id`,
    [userId],
  );
  return reviewStateRows(userId, {
    placements: placements.rows as PlacementRow[],
    catches: catches.rows as CatchRow[],
    reviews: reviews.rows as ReviewRow[],
    battleTurns: battleTurns.rows as BattleTurnRow[],
    battleEnds: battleEnds.rows as BattleEndRow[],
    battleChecks: battleChecks.rows as BattleCheckRow[],
  });
}

const STATE_FIELDS = ["step", "due_day", "caught_day", "stage", "event_count"] as const;

function differences(userId: string, rebuilt: StateRow[], saved: Row[]): string[] {
  const found: string[] = [];
  const savedByItem = new Map(saved.map((row) => [String(row.item_id), row]));
  for (const row of rebuilt) {
    const old = savedByItem.get(row.item_id);
    savedByItem.delete(row.item_id);
    if (!old) {
      found.push(`${userId} ${row.item_id}: not in the backup's review state`);
      continue;
    }
    for (const field of STATE_FIELDS) {
      if ((old[field] ?? null) !== (row[field] ?? null)) {
        found.push(`${userId} ${row.item_id}: ${field} was ${old[field]}, rebuilt ${row[field]}`);
      }
    }
  }
  for (const item of savedByItem.keys()) found.push(`${userId} ${item}: in the backup's review state, but not in the log`);
  return found;
}

/**
 * Loads a backup into an empty database that already has the app's tables.
 * review_state is rebuilt from the restored log and compared with the copy in the file.
 */
export async function restoreBackup(db: Database, backup: Backup): Promise<RestoreReport> {
  if (backup.kind !== "tech-lead-trainer-backup" || backup.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`This restore reads backup schema version ${BACKUP_SCHEMA_VERSION} only.`);
  }
  await db.query("begin");
  try {
    await assertEmpty(db);
    await db.query(INSERT_USERS, [JSON.stringify(backup.users)]);
    await db.query(INSERT_IDENTITIES, [JSON.stringify(backup.users)]);
    for (const table of BACKUP_TABLES) {
      if (table !== "review_state") await insertRows(db, table, backup.tables[table]);
    }

    const reviewStateDifferences: string[] = [];
    const rebuilt: StateRow[] = [];
    for (const user of backup.users) {
      const userState = await rebuildFromLog(db, user.id);
      rebuilt.push(...userState);
      const saved = backup.tables.review_state.filter((row) => row.user_id === user.id);
      reviewStateDifferences.push(...differences(user.id, userState, saved));
    }
    await insertRows(db, "review_state", rebuilt);

    const restoredRows = {} as Record<BackupTable, number>;
    for (const table of BACKUP_TABLES) restoredRows[table] = await count(db, `public.${table}`);
    await db.query("commit");
    return { users: backup.users.length, rows: restoredRows, reviewStateDifferences };
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}
