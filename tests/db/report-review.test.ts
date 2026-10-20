import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addReportNote, reportWrong } from "@/lib/report";
import { loadOpenReports, markReportsDone } from "@/lib/report-review";
import { adminClient, forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

describe("the monthly report review", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("review-list-a");
    b = await signedInUser("review-list-b");
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("lists the open reports of every learner, with their messages, and marks chosen ones done", async () => {
    const first = await reportWrong(a.client, { itemId: "cache", contentHash: "0123456789abcdef", screen: "catch-card" });
    await addReportNote(a.client, first, "The example uses the wrong header.");
    const second = await reportWrong(b.client, { itemId: "cookie", contentHash: "0123456789abcdef", screen: "review" });
    const ours = (reports: { id: number }[]) => reports.filter((r) => r.id === first || r.id === second);

    const open = ours(await loadOpenReports(adminClient()));
    expect(open).toEqual([
      expect.objectContaining({ id: first, itemId: "cache", screen: "catch-card", message: "The example uses the wrong header." }),
      expect.objectContaining({ id: second, itemId: "cookie", screen: "review", message: null }),
    ]);

    expect(await markReportsDone(adminClient(), [first])).toBe(1);
    expect(ours(await loadOpenReports(adminClient())).map((r) => r.id)).toEqual([second]);
    const { data } = await a.client.from("content_reports").select("status").eq("id", first).single();
    expect(data).toEqual({ status: "done" });

    // A report already done is not counted again.
    expect(await markReportsDone(adminClient(), [first])).toBe(0);
  });
});
