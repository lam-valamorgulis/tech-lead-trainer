import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVENT_TABLES } from "../events/write-events.ts";
import { BACKUP_TABLES, NOT_BACKED_UP, backupFileName, isBackupFileName, missingBackupSecrets } from "./backup.ts";

const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url);

function tablesInMigrations(): string[] {
  const names = readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"));
  const sql = names.map((name) => readFileSync(new URL(name, MIGRATIONS), "utf8")).join("\n");
  return [...sql.matchAll(/create table public\.(\w+)/gi)].map((match) => match[1]);
}

describe("the backup tables", () => {
  it("cover every table in the migrations, or say why a table is left out", () => {
    const tables = tablesInMigrations();
    expect(tables).toContain("review_events");
    const covered = new Set<string>([...BACKUP_TABLES, ...Object.keys(NOT_BACKED_UP)]);
    // A new table must be added to BACKUP_TABLES (in insert order) or to NOT_BACKED_UP with a reason.
    expect(tables.filter((table) => !covered.has(table))).toEqual([]);
  });

  it("hold every event table that 'Download my data' exports", () => {
    for (const table of EVENT_TABLES) expect(BACKUP_TABLES).toContain(table);
  });

  it("put allowed_emails and profiles before the tables that need a profile", () => {
    expect(BACKUP_TABLES.slice(0, 2)).toEqual(["allowed_emails", "profiles"]);
  });
});

describe("missingBackupSecrets", () => {
  it("names every secret that is missing or blank", () => {
    expect(missingBackupSecrets({ PRODUCTION_SUPABASE_URL: "https://x.supabase.co", BACKUP_ENCRYPTION_KEY: "  " })).toEqual([
      "PRODUCTION_SUPABASE_SECRET_KEY",
      "BACKUP_ENCRYPTION_KEY",
    ]);
  });

  it("is empty when all three are set", () => {
    expect(
      missingBackupSecrets({
        PRODUCTION_SUPABASE_URL: "https://x.supabase.co",
        PRODUCTION_SUPABASE_SECRET_KEY: "sb_secret_x",
        BACKUP_ENCRYPTION_KEY: "k",
      }),
    ).toEqual([]);
  });
});

describe("backup file names", () => {
  it("are the UTC time of the backup, so they sort by date", () => {
    expect(backupFileName(new Date("2026-10-25T20:00:07.123Z"))).toBe("backup-2026-10-25T200007Z.tltb");
  });

  it("are recognised, and nothing else is", () => {
    expect(isBackupFileName("backup-2026-10-25T200007Z.tltb")).toBe(true);
    for (const name of ["backup-2026-10-25.tltb", "../backup-2026-10-25T200007Z.tltb", "backup-2026-10-25T200007Z.json"]) {
      expect(isBackupFileName(name)).toBe(false);
    }
  });
});
