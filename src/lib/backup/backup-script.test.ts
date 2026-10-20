import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// The weekly job runs `node scripts/backup.mjs create`. Without its secrets it must stop
// before it reads or writes anything, and say which secret is missing.

const SCRIPT = new URL("../../../scripts/backup.mjs", import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), "backup-script-"));

function run(args: string[], env: Record<string, string>) {
  // Only these variables: no secret from the developer's shell reaches the script.
  const only = { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv;
  return spawnSync(process.execPath, [SCRIPT, ...args], { env: only, encoding: "utf8" });
}

afterEach(() => {
  for (const name of readdirSync(out)) rmSync(join(out, name));
});

describe("scripts/backup.mjs create", () => {
  it("stops before any work and names the missing secrets", () => {
    const result = run(["create", "--out", out], { PRODUCTION_SUPABASE_URL: "https://example.supabase.co" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Missing secrets: PRODUCTION_SUPABASE_SECRET_KEY, BACKUP_ENCRYPTION_KEY. Nothing was read or stored. Add them with scripts/setup-backup.sh.",
    );
    expect(readdirSync(out)).toEqual([]);
  });

  it("refuses a malformed key without printing it", () => {
    const result = run(["create", "--out", out], {
      PRODUCTION_SUPABASE_URL: "https://example.supabase.co",
      PRODUCTION_SUPABASE_SECRET_KEY: "sb_secret_do_not_print",
      BACKUP_ENCRYPTION_KEY: "too-short-key",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BACKUP_ENCRYPTION_KEY must be 32 random bytes in base64");
    expect(result.stdout + result.stderr).not.toContain("too-short-key");
    expect(result.stdout + result.stderr).not.toContain("sb_secret_do_not_print");
    expect(readdirSync(out)).toEqual([]);
  });
});

describe("scripts/backup.mjs", () => {
  it("lists its commands when the command is unknown", () => {
    const result = run(["nonsense"], {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage: node scripts/backup.mjs create --out <dir> | record --file <file> | restore-check [--file <file>] [--keep]");
  });
});
