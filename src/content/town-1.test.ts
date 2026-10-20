import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { townSchema, type Creature, type Move } from "./schema.ts";

// Ticket #10: the shape of town 1, on top of the rules the checker enforces for every town.
const town = townSchema.parse(JSON.parse(readFileSync("content/towns/t01.json", "utf8")));
const items: (Creature | Move)[] = town.creatures.flatMap((creature) => [creature, ...creature.moves]);

// The month 1 primary sources (research/roadmap-sources.md, month 1).
const PRIMARY_SOURCE_HOSTS = ["developer.mozilla.org", "www.rfc-editor.org"];

describe("town 1 content", () => {
  it("is town number 1, Web and HTTP in depth", () => {
    expect(town).toMatchObject({ id: "t01", number: 1, name: "Web and HTTP in depth" });
  });

  it("has about 15 creatures, each with 2 to 4 moves", () => {
    expect(town.creatures.length).toBeGreaterThanOrEqual(14);
    expect(town.creatures.length).toBeLessThanOrEqual(16);
    for (const creature of town.creatures) {
      expect(creature.moves.length, creature.id).toBeGreaterThanOrEqual(2);
      expect(creature.moves.length, creature.id).toBeLessThanOrEqual(4);
    }
  });

  it("includes TLS and CORS as security creatures", () => {
    const ids = town.creatures.map((c) => c.id);
    expect(ids).toContain("tls");
    expect(ids).toContain("cors");
  });

  it("cites a month 1 primary source on every card", () => {
    for (const item of items) {
      expect(PRIMARY_SOURCE_HOSTS, item.id).toContain(new URL(item.card.source.url).host);
    }
  });

  it("puts only town 1 items in its confusable pairs, and never pairs an item with itself", () => {
    const ids = new Set(items.map((item) => item.id));
    expect(town.confusablePairs.length).toBeGreaterThan(0);
    for (const [a, b] of town.confusablePairs) {
      expect(ids.has(a) && ids.has(b), `${a} + ${b}`).toBe(true);
      expect(a).not.toBe(b);
    }
  });
});
