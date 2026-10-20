// Makes a new, empty database on the local Supabase server, with the same tables, triggers and
// policies as the local `postgres` database, but no rows. A restore test goes into it, so the
// shared `postgres` database is never wiped (ticket #22).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readLocalSupabase } from "./local-supabase.mjs";

/** Only names that start with restore_, so these helpers can never drop `postgres`. */
const NAME = /^restore_[a-z0-9_]{1,40}$/;

function checkName(name) {
  if (!NAME.test(name)) throw new Error(`Refusing to use database "${name}": the name must look like restore_check_1.`);
}

/** The local database container that `supabase start` runs, named after project_id. */
function container() {
  const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId) throw new Error("supabase/config.toml has no project_id.");
  return `supabase_db_${projectId}`;
}

function psql(database, args, input) {
  execFileSync("docker", ["exec", "-i", container(), "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-q", ...args], {
    input,
    stdio: ["pipe", "ignore", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Creates the database and copies the layout of the auth, private and public schemas into it.
 * Owners and grants are left out: the restore connects as the owner, `postgres`.
 * @returns {string} a connection URL for the new database
 */
export function createEmptyDatabase(name) {
  checkName(name);
  const local = readLocalSupabase();
  psql("postgres", ["-c", `create database ${name}`]);
  psql(name, ["-c", "drop schema public cascade"]);
  const layout = execFileSync(
    "docker",
    ["exec", container(), "pg_dump", "-U", "postgres", "--schema-only", "--no-owner", "--no-privileges", "-n", "auth", "-n", "private", "-n", "public", "postgres"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  psql(name, [], layout);
  const url = new URL(local.databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export function dropDatabase(name) {
  checkName(name);
  psql("postgres", ["-c", `drop database if exists ${name} with (force)`]);
}
