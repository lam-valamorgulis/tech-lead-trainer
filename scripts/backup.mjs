// The weekly backup and the restore check (ticket #22, design 12.6).
//
//   node scripts/backup.mjs create --out <dir>    export and encrypt production (the weekly job)
//   node scripts/backup.mjs record --file <file>  record a stored file, for "Last backup" (the weekly job)
//   npm run backup:restore-check [-- --file <file>] [--keep]
//                                                 restore a backup into a new empty local database
//
// Secrets come only from the environment (GitHub Actions secrets) or the git-ignored
// .env.backup file. No message ever prints a key or a row of data.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import {
  BACKUP_TABLES,
  backupFileName,
  isBackupFileName,
  missingBackupSecrets,
  readBackup,
  recordBackup,
} from "../src/lib/backup/backup.ts";
import { openBackup, parseBackupKey, sealBackup } from "../src/lib/backup/seal.ts";

const USAGE =
  "Usage: node scripts/backup.mjs create --out <dir> | record --file <file> | restore-check [--file <file>] [--keep]";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function productionSecrets() {
  const missing = missingBackupSecrets(process.env);
  if (missing.length > 0) {
    fail(`Missing secrets: ${missing.join(", ")}. Nothing was read or stored. Add them with scripts/setup-backup.sh.`);
  }
  return { key: readKey(process.env.BACKUP_ENCRYPTION_KEY), client: productionClient() };
}

function readKey(value) {
  try {
    return parseBackupKey(value ?? "");
  } catch (error) {
    return fail(error.message);
  }
}

function productionClient() {
  return createClient(process.env.PRODUCTION_SUPABASE_URL, process.env.PRODUCTION_SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rowCounts(backup) {
  return BACKUP_TABLES.map((table) => `${table} ${(backup.tables[table] ?? []).length}`).join(", ");
}

async function create(out) {
  if (!out) fail(USAGE);
  const { key, client } = productionSecrets();
  const backup = await readBackup(client);
  const sealed = sealBackup(backup, key);
  // Open the file again before it leaves this machine: a file that cannot be read is no backup.
  if (JSON.stringify(openBackup(sealed, key)) !== JSON.stringify(backup)) fail("The sealed file does not open to the same backup.");

  const name = backupFileName(new Date(backup.createdAt));
  writeFileSync(join(out, name), sealed, { mode: 0o600, flag: "wx" });
  console.log(`Wrote ${name}: ${sealed.length} bytes, ${backup.users.length} user(s). Rows: ${rowCounts(backup)}.`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `file=${name}\n`);
}

async function record(file) {
  if (!file) fail(USAGE);
  const { key, client } = productionSecrets();
  const backup = openBackup(readFileSync(file), key);
  await recordBackup(client, { fileName: basename(file), userIds: backup.users.map((user) => user.id) });
  console.log(`Recorded ${basename(file)} for ${backup.users.length} user(s).`);
}

/** The newest backup on the backups branch. Run `git fetch origin backups` first. */
function newestStoredBackup() {
  const listed = execFileSync("git", ["ls-tree", "--name-only", "origin/backups", "backups/"], { encoding: "utf8" });
  const names = listed
    .split("\n")
    .map((path) => basename(path))
    .filter(isBackupFileName)
    .sort();
  if (names.length === 0) fail("No backup on origin/backups. Run: git fetch origin backups");
  const name = names.at(-1);
  return { name, file: execFileSync("git", ["show", `origin/backups:backups/${name}`], { maxBuffer: 256 * 1024 * 1024 }) };
}

/** The key from the environment, or from .env.backup at the repo root (git-ignored). */
function localKey() {
  if (process.env.BACKUP_ENCRYPTION_KEY) return readKey(process.env.BACKUP_ENCRYPTION_KEY);
  const envFile = new URL("../.env.backup", import.meta.url);
  if (!existsSync(envFile)) fail("No key: set BACKUP_ENCRYPTION_KEY or run scripts/setup-backup.sh to write .env.backup.");
  const line = readFileSync(envFile, "utf8").match(/^BACKUP_ENCRYPTION_KEY=(.*)$/m);
  return readKey(line?.[1]);
}

async function restoreCheck(file, keep) {
  const { default: pg } = await import("pg");
  const { container, createEmptyDatabase, dropDatabase } = await import("./empty-database.mjs");
  const { restoreBackup } = await import("../src/lib/backup/restore.ts");

  const key = localKey();
  const source = file ? { name: basename(file), file: readFileSync(file) } : newestStoredBackup();
  const backup = openBackup(source.file, key);
  console.log(`Opened ${source.name}: made ${backup.createdAt}, ${backup.users.length} user(s).`);

  const database = `restore_check_${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  const db = new pg.Client({ connectionString: createEmptyDatabase(database) });
  let ok = false;
  try {
    await db.connect();
    const report = await restoreBackup(db, backup);
    console.log(`Restored into the empty local database ${database}.`);
    console.log("table               | in file | restored");
    for (const table of BACKUP_TABLES) {
      const same = report.rows[table] === (backup.tables[table] ?? []).length;
      console.log(`${table.padEnd(19)} | ${String((backup.tables[table] ?? []).length).padStart(7)} | ${String(report.rows[table]).padStart(8)}${same ? "" : "  DIFFERENT"}`);
    }
    for (const line of report.reviewStateDifferences) console.log(`review_state difference: ${line}`);
    ok = BACKUP_TABLES.every((table) => report.rows[table] === (backup.tables[table] ?? []).length) && report.reviewStateDifferences.length === 0;
    console.log(ok ? "PASS: every row is back and the rebuilt review state is the same." : "FAIL: see the lines above.");
  } finally {
    await db.end();
    if (keep) console.log(`Kept ${database}. Drop it later with: docker exec ${container()} dropdb -U postgres ${database}`);
    else dropDatabase(database);
  }
  if (!ok) process.exit(1);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" }, file: { type: "string" }, keep: { type: "boolean", default: false } },
});

try {
  switch (positionals[0]) {
    case "create":
      await create(values.out);
      break;
    case "record":
      await record(values.file);
      break;
    case "restore-check":
      await restoreCheck(values.file, values.keep);
      break;
    default:
      fail(USAGE);
  }
} catch (error) {
  // The message only: a stack or a request object could hold a URL with a key in it.
  fail(`Backup failed: ${error?.message ?? error}`);
}
