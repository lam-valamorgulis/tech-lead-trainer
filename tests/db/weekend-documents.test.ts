import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/profile";
import { loadDesignDoc, saveDesignDoc } from "@/lib/weekend-doc";
import { forgetEmail, signedInUser } from "./helpers";

type User = { id: string; email: string; client: SupabaseClient };

const doc = (problem: string) => ({ problem, options: "Cache or CDN.", decision: "", tradeOffs: "", risks: "", diagram: "graph TD" });

describe("weekend documents", () => {
  let a: User;
  let b: User;

  beforeAll(async () => {
    a = await signedInUser("weekend-a");
    b = await signedInUser("weekend-b");
    await ensureProfile(a.client);
    await ensureProfile(b.client);
  });

  afterAll(async () => {
    await forgetEmail(a.email);
    await forgetEmail(b.email);
  });

  it("are saved per learner and document, and a later save replaces the text", async () => {
    expect(await loadDesignDoc(a.client, "t99-boss")).toBeNull();
    await saveDesignDoc(a.client, "t99-boss", doc("The page is slow."));
    await saveDesignDoc(a.client, "t99-boss", doc("The page is slow for far visitors."));
    expect(await loadDesignDoc(a.client, "t99-boss")).toEqual(doc("The page is slow for far visitors."));
    const { data } = await a.client.from("weekend_documents").select("id");
    expect(data).toHaveLength(1);
  });

  it("are hidden from other learners, who cannot change them either", async () => {
    await saveDesignDoc(a.client, "t98-boss", doc("Private."));
    expect(await loadDesignDoc(b.client, "t98-boss")).toBeNull();
    const changed = await b.client.from("weekend_documents").update({ problem: "hacked" }).eq("document_key", "t98-boss").select();
    expect(changed.data).toEqual([]);
  });

  it("refuse a text over 20,000 characters and a key that is not <town>-boss", async () => {
    await expect(saveDesignDoc(a.client, "t99-boss", doc("x".repeat(20_001)))).rejects.toThrow();
    await expect(saveDesignDoc(a.client, "../boss", doc("x"))).rejects.toThrow();
  });
});
