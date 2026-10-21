import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadOpenFeedback, markFeedbackDone, sendFeedback } from "@/lib/feedback";
import { adminClient, forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

describe("feedback notes (#95)", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("feedback-a");
    b = await signedInUser("feedback-b");
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  const ownNotes = async (user: User) =>
    (await user.client.from("feedback").select("id, screen, message, status").order("id")).data ?? [];

  it("store the screen, the note and status open", async () => {
    await sendFeedback(a.client, { screen: "map", message: "  The map is hard to read.  " });
    expect(await ownNotes(a)).toEqual([{ id: expect.any(Number), screen: "map", message: "The map is hard to read.", status: "open" }]);
  });

  it("are hidden from other users, who cannot change them either", async () => {
    expect(await ownNotes(b)).toEqual([]);
    const [note] = await ownNotes(a);
    const changed = await b.client.from("feedback").update({ message: "hacked" }).eq("id", note.id).select();
    expect(changed.error?.code).toBe("42501");
  });

  it("cannot be edited, deleted or marked done by the learner", async () => {
    const [note] = await ownNotes(a);
    for (const change of [{ message: "Changed." }, { status: "done" }]) {
      const result = await a.client.from("feedback").update(change).eq("id", note.id);
      expect(result.error?.code).toBe("42501");
    }
    const deleted = await a.client.from("feedback").delete().eq("id", note.id);
    expect(deleted.error?.code).toBe("42501");
    expect(await ownNotes(a)).toEqual([expect.objectContaining({ message: "The map is hard to read.", status: "open" })]);
  });

  it("are listed and marked done only with the server key", async () => {
    await sendFeedback(b.client, { screen: "session", message: "The timer jumps." });
    const open = (await loadOpenFeedback(adminClient())).filter((n) => ["map", "session"].includes(n.screen));
    const ours = open.filter((n) => ["The map is hard to read.", "The timer jumps."].includes(n.message));
    expect(ours.map((n) => n.screen).sort()).toEqual(["map", "session"]);

    expect(await markFeedbackDone(adminClient(), ours.map((n) => n.id))).toBe(2);
    expect(await ownNotes(a)).toEqual([expect.objectContaining({ status: "done" })]);
    // Done notes leave the open list, and a second run changes nothing.
    const after = await loadOpenFeedback(adminClient());
    expect(after.filter((n) => ours.some((o) => o.id === n.id))).toEqual([]);
    expect(await markFeedbackDone(adminClient(), ours.map((n) => n.id))).toBe(0);
  });

  it("are always open when written: a learner cannot write a status, a user or a time", async () => {
    for (const extra of [{ status: "done" }, { user_id: b.id }, { created_at: "2020-01-01T00:00:00Z" }]) {
      const result = await a.client.from("feedback").insert({ screen: "map", message: "Sneaky.", ...extra });
      expect(result.error?.code).toBe("42501");
    }
  });

  it("refuse an empty note, a note over 1000 characters and a screen that is not a slug", async () => {
    await expect(sendFeedback(a.client, { screen: "map", message: "   " })).rejects.toThrow();
    await expect(sendFeedback(a.client, { screen: "map", message: "x".repeat(1001) })).rejects.toThrow();
    await expect(sendFeedback(a.client, { screen: "Map Screen", message: "Hi." })).rejects.toThrow();
  });

  it("are printed as Markdown by `npm run feedback` on local Supabase, and marked done by --done", async () => {
    await sendFeedback(a.client, { screen: "field-guide", message: "Show the stage of each creature." });
    const [note] = (await ownNotes(a)).filter((n) => n.status === "open");
    const printed = execFileSync("node", ["scripts/feedback.mjs"], { encoding: "utf8" });
    expect(printed).toMatch(/^# Open feedback: \d+/);
    expect(printed).toContain(`- #${note.id}, `);
    expect(printed).toContain(": Show the stage of each creature.");
    expect(printed).toMatch(/## field-guide: \d+/);

    const done = execFileSync("node", ["scripts/feedback.mjs", "--done", String(note.id), String(note.id)], { encoding: "utf8" });
    expect(done).toContain("Marked 1 of 1 note(s) done.");
    expect(await ownNotes(a)).toContainEqual(expect.objectContaining({ id: note.id, status: "done" }));
  });
});
