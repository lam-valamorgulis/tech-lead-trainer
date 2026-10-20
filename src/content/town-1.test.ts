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

  // Ticket #18: battle scenarios.
  it("has at least 12 battle scenarios, enough for most days of month 1 and the Gym", () => {
    expect(town.scenarios.length).toBeGreaterThanOrEqual(12);
  });

  it("uses only moves of town 1 creatures in its move tables", () => {
    const moveIds = new Set(town.creatures.flatMap((creature) => creature.moves.map((move) => move.id)));
    for (const scenario of town.scenarios) {
      for (const turn of scenario.turns) {
        for (const row of turn.moves) expect(moveIds.has(row.moveId), `${scenario.id}: ${row.moveId}`).toBe(true);
      }
    }
  });

  it("puts the best move in every row position, so the file order gives no hint", () => {
    const turns = town.scenarios.flatMap((scenario) => scenario.turns);
    const bestPositions = new Set(
      turns.map((turn) => turn.moves.findIndex((row) => row.damage === Math.max(...turn.moves.map((r) => r.damage)))),
    );
    expect([...bestPositions].sort()).toEqual([0, 1, 2, 3]);
  });

  it("orders scenarios by the day they can start, so early days have a battle", () => {
    // The app offers a scenario once the creature of each best move is caught, in catch order.
    const catchOrder = town.creatures.map((creature) => creature.id);
    const readyAfter = town.scenarios.map((scenario) =>
      Math.max(
        ...scenario.turns.map((turn) => {
          const best = turn.moves.reduce((top, row) => (row.damage > top.damage ? row : top));
          return catchOrder.indexOf(best.moveId.split(".")[0]);
        }),
      ),
    );
    expect(readyAfter).toEqual([...readyAfter].sort((a, b) => a - b));
    // The first scenario needs only the first 2 creatures: Client and server, HTTP message.
    expect(readyAfter[0]).toBe(1);
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
