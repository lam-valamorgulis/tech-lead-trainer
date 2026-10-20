import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordBackup } from "@/lib/backup/backup";
import { fetchLastBackupAt } from "@/lib/backup/last-backup";
import { adminClient, forgetEmail, signedInUser } from "./helpers";

// "Last backup: <date>" in Settings (ticket #22). The weekly job records a backup only after
// the file is stored, so a failed week adds nothing and the old date stays.

type User = { id: string; email: string; client: SupabaseClient };

let stamp = 0;
const fileName = () => `backup-2026-10-${String(10 + (stamp++ % 10)).padStart(2, "0")}T${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}Z.tltb`;

describe("recorded backups", () => {
  let inBackup: User;
  let notInBackup: User;

  beforeAll(async () => {
    inBackup = await signedInUser("backup-run-in");
    notInBackup = await signedInUser("backup-run-out");
  });

  afterAll(async () => {
    // Deleting the accounts deletes their backup rows too.
    await forgetEmail(inBackup.email);
    await forgetEmail(notInBackup.email);
  });

  it("are empty until a backup holds the learner", async () => {
    expect(await fetchLastBackupAt(inBackup.client)).toBeNull();
  });

  it("show the newest backup that holds the learner, and nothing to anyone else", async () => {
    await recordBackup(adminClient(), { fileName: fileName(), userIds: [inBackup.id], finishedAt: new Date("2026-10-12T20:00:00Z") });
    await recordBackup(adminClient(), { fileName: fileName(), userIds: [inBackup.id], finishedAt: new Date("2026-10-19T20:00:00Z") });

    expect(await fetchLastBackupAt(inBackup.client)).toEqual(new Date("2026-10-19T20:00:00Z"));
    expect(await fetchLastBackupAt(notInBackup.client)).toBeNull();
  });

  it("cannot be added or changed by a learner, only by the server", async () => {
    const added = await inBackup.client
      .from("backups")
      .insert({ user_id: inBackup.id, file_name: fileName(), finished_at: new Date().toISOString() });
    expect(added.error).not.toBeNull();
    await inBackup.client.from("backups").update({ finished_at: new Date().toISOString() }).eq("user_id", inBackup.id);
    await inBackup.client.from("backups").delete().eq("user_id", inBackup.id);

    expect(await fetchLastBackupAt(inBackup.client)).toEqual(new Date("2026-10-19T20:00:00Z"));
  });

  it("refuses a file name that is not a backup name", async () => {
    await expect(recordBackup(adminClient(), { fileName: "../notes.txt", userIds: [inBackup.id] })).rejects.toThrow(
      "Not a backup file name: ../notes.txt",
    );
  });

  it("still records the other learners when one account was deleted after the export", async () => {
    const at = new Date("2026-10-26T20:00:00Z");
    await recordBackup(adminClient(), { fileName: fileName(), userIds: [crypto.randomUUID(), inBackup.id], finishedAt: at });

    expect(await fetchLastBackupAt(inBackup.client)).toEqual(at);
  });

  it("records nothing for a backup that holds no learner", async () => {
    await expect(recordBackup(adminClient(), { fileName: fileName(), userIds: [] })).resolves.toBeUndefined();
  });
});
