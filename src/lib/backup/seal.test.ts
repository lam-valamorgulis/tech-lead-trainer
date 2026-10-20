import { describe, expect, it } from "vitest";
import { openBackup, parseBackupKey, sealBackup } from "./seal.ts";

// Two fixed 32-byte keys, written as base64 the way the wizard makes them.
const KEY = parseBackupKey("q2V5LWZvci10ZXN0cy1vbmx5LTMyLWJ5dGVzLWxvbmc=");
const OTHER_KEY = parseBackupKey("7Cfj0ti6xewwvkLZrvqLP4uALaZQvPf0cuxTkWFRPig=");

const backup = { schemaVersion: 1, note: "Café, 04:00, 世界" };

describe("sealBackup and openBackup", () => {
  it("give back the same backup with the same key", () => {
    expect(openBackup(sealBackup(backup, KEY), KEY)).toEqual(backup);
  });

  it("never write the backup as readable text", () => {
    const sealed = sealBackup(backup, KEY);
    expect(sealed.toString("latin1")).not.toContain("schemaVersion");
    expect(sealed.toString("latin1")).not.toContain("04:00");
  });

  it("make a different file each time, so two equal backups do not look equal", () => {
    expect(sealBackup(backup, KEY).equals(sealBackup(backup, KEY))).toBe(false);
  });

  it("refuse the wrong key", () => {
    expect(() => openBackup(sealBackup(backup, KEY), OTHER_KEY)).toThrow(
      "The backup cannot be opened: the key is wrong or the file is damaged.",
    );
  });

  it("refuse a file with one changed byte", () => {
    const sealed = sealBackup(backup, KEY);
    sealed[sealed.length - 20] ^= 1;
    expect(() => openBackup(sealed, KEY)).toThrow("the key is wrong or the file is damaged");
  });

  it("refuse a file that is not a backup", () => {
    expect(() => openBackup(Buffer.from('{"schemaVersion":1}'), KEY)).toThrow("This is not a Tech Lead Trainer backup file.");
  });
});

describe("parseBackupKey", () => {
  it("accepts 32 bytes in base64, with spaces or a line break around it", () => {
    expect(parseBackupKey(" q2V5LWZvci10ZXN0cy1vbmx5LTMyLWJ5dGVzLWxvbmc=\n")).toHaveLength(32);
  });

  it("refuses a key that is too short or not base64, without showing it", () => {
    for (const bad of ["", "c2hvcnQ=", "not base64 at all!", "q2V5LWZvci10ZXN0cy1vbmx5LTMyLWJ5dGVzLWxvbmc=AA"]) {
      expect(() => parseBackupKey(bad)).toThrow("BACKUP_ENCRYPTION_KEY must be 32 random bytes in base64 (openssl rand -base64 32).");
      if (bad) {
        try {
          parseBackupKey(bad);
        } catch (error) {
          expect(String(error)).not.toContain(bad);
        }
      }
    }
  });
});
