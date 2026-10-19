import { describe, expect, it } from "vitest";
import { addNewIds } from "./ledger.ts";

describe("addNewIds", () => {
  it("adds new ids at the end, in content order", () => {
    expect(addNewIds(["t01", "cache"], ["t01", "cache", "cache.ttl", "cookie"])).toEqual([
      "t01",
      "cache",
      "cache.ttl",
      "cookie",
    ]);
  });

  it("never removes an id, even when the content no longer has it", () => {
    expect(addNewIds(["t01", "cache", "old-thing"], ["t01", "cache"])).toEqual(["t01", "cache", "old-thing"]);
  });
});
