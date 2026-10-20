import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addReportNote, reportWrong } from "@/lib/report";
import { forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

describe("content reports", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("report-a");
    b = await signedInUser("report-b");
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("store the item, content hash, screen and status open after one tap, and an optional note", async () => {
    const id = await reportWrong(a.client, { itemId: "cache", contentHash: "0123456789abcdef", screen: "catch-card" });
    const first = await a.client.from("content_reports").select("item_id, content_hash, screen, message, status").eq("id", id).single();
    expect(first.data).toEqual({
      item_id: "cache",
      content_hash: "0123456789abcdef",
      screen: "catch-card",
      message: null,
      status: "open",
    });

    await addReportNote(a.client, id, "The example uses the wrong header.");
    const second = await a.client.from("content_reports").select("message").eq("id", id).single();
    expect(second.data).toEqual({ message: "The example uses the wrong header." });
  });

  it("are hidden from other users, who cannot change them either", async () => {
    const id = await reportWrong(a.client, { itemId: "cookie", contentHash: "0123456789abcdef", screen: "review" });
    const read = await b.client.from("content_reports").select("id").eq("id", id);
    expect(read.data).toEqual([]);
    const changed = await b.client.from("content_reports").update({ message: "hacked" }).eq("id", id).select();
    expect(changed.data).toEqual([]);
  });

  it("let the learner add a note, but not mark a report done, change it or delete it", async () => {
    const id = await reportWrong(a.client, { itemId: "cache", contentHash: "0123456789abcdef", screen: "review" });
    const done = await a.client.from("content_reports").update({ status: "done" }).eq("id", id);
    expect(done.error?.code).toBe("42501");
    const moved = await a.client.from("content_reports").update({ item_id: "cookie" }).eq("id", id);
    expect(moved.error?.code).toBe("42501");
    const deleted = await a.client.from("content_reports").delete().eq("id", id);
    expect(deleted.error?.code).toBe("42501");
    await addReportNote(a.client, id, "Still allowed.");
  });

  it("refuse a screen that does not exist", async () => {
    await expect(reportWrong(a.client, { itemId: "cache", contentHash: "0123456789abcdef", screen: "nowhere" as "review" })).rejects.toThrow();
  });
});
