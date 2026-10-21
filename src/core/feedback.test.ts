import { describe, expect, it } from "vitest";
import { formatOpenFeedback, screenOf } from "./feedback.ts";

describe("screenOf", () => {
  it("names each screen by the first part of its path", () => {
    expect(screenOf("/")).toBe("home");
    expect(screenOf("/map")).toBe("map");
    expect(screenOf("/field-guide")).toBe("field-guide");
    expect(screenOf("/settings")).toBe("settings");
    expect(screenOf("/weekend")).toBe("weekend");
    expect(screenOf("/weekend/t01")).toBe("weekend");
    expect(screenOf("/gym/t01")).toBe("gym");
    expect(screenOf("/placement/t01")).toBe("placement");
  });

  it("keeps the ADR editor apart from the weekend screen", () => {
    expect(screenOf("/weekend/t01/adr")).toBe("weekend-adr");
  });

  it("uses the session name while a session runs on home", () => {
    expect(screenOf("/", "session")).toBe("session");
  });

  it("gives a name the database accepts for any path", () => {
    expect(screenOf("/Map_Old")).toBe("mapold");
    expect(screenOf("/__")).toBe("other");
    expect(screenOf(`/${"a".repeat(39)}-b`)).toBe("a".repeat(39));
  });
});

describe("formatOpenFeedback", () => {
  it("says there is nothing to triage when no note is open", () => {
    expect(formatOpenFeedback([])).toBe("# Open feedback: 0\n\nNothing to triage.\n");
  });

  it("groups the notes by screen, the busiest screen first, oldest note first, one line each", () => {
    const markdown = formatOpenFeedback([
      { id: 3, screen: "map", message: "The map is hard to read.", createdAt: "2026-10-21T08:00:00Z" },
      { id: 1, screen: "session", message: "The timer\njumps.", createdAt: "2026-10-20T08:00:00Z" },
      { id: 2, screen: "session", message: "Too many reviews.", createdAt: "2026-10-19T08:00:00Z" },
    ]);
    expect(markdown).toBe(
      [
        "# Open feedback: 3",
        "",
        "## session: 2",
        "",
        "- #2, 2026-10-19: Too many reviews.",
        "- #1, 2026-10-20: The timer jumps.",
        "",
        "## map: 1",
        "",
        "- #3, 2026-10-21: The map is hard to read.",
        "",
        "After triage, mark the notes done: `npm run feedback -- --done 2 1 3`",
        "",
      ].join("\n"),
    );
  });
});
