import { describe, expect, it } from "vitest";
import { formatOpenReports, type OpenReport } from "./report-review.ts";

const report = (overrides: Partial<OpenReport>): OpenReport => ({
  id: 1,
  itemId: "cache",
  contentHash: "aaaaaaaaaaaaaaaa",
  screen: "catch-card",
  message: null,
  createdAt: "2026-10-21T09:00:00Z",
  ...overrides,
});

// What the review needs from the content: an item's name and its current hash.
const content = new Map([
  ["cache", { name: "Cache", hash: "aaaaaaaaaaaaaaaa" }],
  ["cache.ttl", { name: "TTL", hash: "bbbbbbbbbbbbbbbb" }],
]);

describe("formatOpenReports", () => {
  it("groups open reports by item, in item order, and shows each message", () => {
    const text = formatOpenReports(
      [
        report({ id: 7, itemId: "cache.ttl", screen: "review", message: "The answer says 60 seconds." }),
        report({ id: 3, message: "The example uses the wrong header." }),
        report({ id: 5, createdAt: "2026-10-22T09:00:00Z" }),
      ],
      content,
    );
    expect(text).toBe(
      [
        "# Open reports: 3",
        "",
        "## Cache (`cache`): 2",
        "",
        '- #3 · 2026-10-21 · catch card · "The example uses the wrong header."',
        "- #5 · 2026-10-22 · catch card · no message",
        "",
        "## TTL (`cache.ttl`): 1",
        "",
        '- #7 · 2026-10-21 · review · "The answer says 60 seconds." · changed since',
        "",
        "Mark reports done: `npm run reports -- --done 3 5 7`",
        "",
      ].join("\n"),
    );
  });

  it("ends with the done command of the database it ran on", () => {
    expect(formatOpenReports([report({ id: 9 })], content, "npm run reports -- --live")).toContain(
      "Mark reports done: `npm run reports -- --live --done 9`",
    );
  });

  it("says when nothing is open", () => {
    expect(formatOpenReports([], content)).toBe("# Open reports: 0\n\nNothing to review.\n");
  });

  it("still lists a report on an item that no longer exists", () => {
    expect(formatOpenReports([report({ itemId: "dns" })], content)).toContain("## dns (`dns`): 1");
  });
});
