import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

// The weekly backup file (ticket #22, design 12.6): gzip, then AES-256-GCM.
// GCM checks every byte, so a wrong key or a damaged file is refused, never half read.
//
// File layout: MAGIC (5 bytes) | nonce (12) | encrypted gzip | auth tag (16).

const MAGIC = Buffer.from("TLTB1");
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/** 32 random bytes in base64 is exactly 43 characters and one "=". */
const KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/;

/** Reads BACKUP_ENCRYPTION_KEY. The error never repeats the value, so a key cannot reach a log. */
export function parseBackupKey(base64: string): Buffer {
  const trimmed = base64.trim();
  if (!KEY_PATTERN.test(trimmed)) {
    throw new Error("BACKUP_ENCRYPTION_KEY must be 32 random bytes in base64 (openssl rand -base64 32).");
  }
  return Buffer.from(trimmed, "base64");
}

export function sealBackup(backup: unknown, key: Buffer): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const body = Buffer.concat([cipher.update(gzipSync(JSON.stringify(backup))), cipher.final()]);
  return Buffer.concat([MAGIC, nonce, body, cipher.getAuthTag()]);
}

export function openBackup(file: Buffer, key: Buffer): unknown {
  if (file.length < MAGIC.length + NONCE_BYTES + TAG_BYTES || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("This is not a Tech Lead Trainer backup file.");
  }
  const nonce = file.subarray(MAGIC.length, MAGIC.length + NONCE_BYTES);
  const body = file.subarray(MAGIC.length + NONCE_BYTES, file.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(file.subarray(file.length - TAG_BYTES));
  let zipped: Buffer;
  try {
    zipped = Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    throw new Error("The backup cannot be opened: the key is wrong or the file is damaged.");
  }
  return JSON.parse(gunzipSync(zipped).toString("utf8"));
}
