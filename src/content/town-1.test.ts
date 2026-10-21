import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kindOf, townSchema, type Creature, type Move } from "./schema.ts";

// Ticket #10: the shape of town 1, on top of the rules the checker enforces for every town.
const town = townSchema.parse(JSON.parse(readFileSync("content/towns/t01.json", "utf8")));
const items: (Creature | Move)[] = town.creatures.flatMap((creature) => [creature, ...creature.moves]);
const battles = town.scenarios.filter((scenario) => kindOf(scenario) === "battle");
// The battles the app offers today: no Meeting Battle, no Agent Diff Battle and no Gym twin yet.
const offered = battles.filter((scenario) => scenario.twinOf === undefined);

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
    expect(offered.length).toBeGreaterThanOrEqual(12);
  });

  it("uses only moves of town 1 creatures in its move tables", () => {
    const moveIds = new Set(town.creatures.flatMap((creature) => creature.moves.map((move) => move.id)));
    for (const scenario of battles) {
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
    const readyAfter = offered.map((scenario) =>
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

  // Ticket #107: the v1.5 battles.
  it("gives every scenario a source link and every turn a Constraint, 3 Reasons and Skills", () => {
    for (const scenario of town.scenarios) {
      expect(scenario.source, scenario.id).toBeDefined();
      for (const turn of scenario.turns) {
        expect(turn.constraint, scenario.id).toBeDefined();
        expect(turn.reasons, scenario.id).toHaveLength(3);
        expect(turn.skills?.length, scenario.id).toBeGreaterThan(0);
      }
    }
  });

  it("puts the right Reason in every position, so the file order gives no hint", () => {
    const positions = new Set(town.scenarios.flatMap((s) => s.turns.map((turn) => turn.reasons!.findIndex((reason) => reason.right))));
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });

  it("does not make the right Reason the longest or the shortest too often, so its length gives no hint", () => {
    const turns = town.scenarios.flatMap((s) => s.turns);
    const rank = (turn: (typeof turns)[number]) => {
      const lengths = turn.reasons!.map((reason) => reason.text.length);
      const right = lengths[turn.reasons!.findIndex((reason) => reason.right)];
      return right === Math.max(...lengths) ? "longest" : right === Math.min(...lengths) ? "shortest" : "middle";
    };
    const share = (place: string) => turns.filter((turn) => rank(turn) === place).length / turns.length;
    expect(share("longest")).toBeLessThanOrEqual(0.45);
    expect(share("shortest")).toBeLessThanOrEqual(0.45);
  });

  it("has 4 to 8 Meeting Battles that train Skills 19 to 21 and 26", () => {
    const meetings = town.scenarios.filter((s) => kindOf(s) === "meeting");
    expect(meetings.length).toBeGreaterThanOrEqual(4);
    expect(meetings.length).toBeLessThanOrEqual(8);
    const skills = new Set(meetings.flatMap((s) => s.turns.flatMap((turn) => turn.skills!)));
    for (const skill of [19, 20, 21, 26]) expect(skills.has(skill), `Skill ${skill}`).toBe(true);
  });

  it("has 4 Agent Diff Battles that train Skills 14 and 15", () => {
    const diffs = town.scenarios.filter((s) => kindOf(s) === "agent-diff");
    expect(diffs).toHaveLength(4);
    for (const scenario of diffs) {
      const skills = new Set(scenario.turns.flatMap((turn) => turn.skills!));
      expect(skills.has(14) || skills.has(15), scenario.id).toBe(true);
    }
  });

  it("has at least 5 Gym twins, each of a normal Battle the app offers", () => {
    const twins = battles.filter((s) => s.twinOf !== undefined);
    expect(twins.length).toBeGreaterThanOrEqual(5);
    const offeredIds = new Set(offered.map((s) => s.id));
    for (const twin of twins) expect(offeredIds.has(twin.twinOf!), twin.id).toBe(true);
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
