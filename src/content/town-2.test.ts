import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { glossarySegments } from "./glossary.ts";
import { glossarySchema, townSchema, type Creature, type Move, type Town } from "./schema.ts";

// Ticket #37: the shape of town 2, on top of the rules the checker enforces for every town.
const readTown = (path: string): Town => townSchema.parse(JSON.parse(readFileSync(path, "utf8")));
const town = readTown("content/towns/t02.json");
const townOne = readTown("content/towns/t01.json");
const itemsOf = (t: Town): (Creature | Move)[] => t.creatures.flatMap((creature) => [creature, ...creature.moves]);
const items = itemsOf(town);

// The month 2 primary sources (research/roadmap-sources.md, month 2).
const PRIMARY_SOURCE_HOSTS = [
  "google.aip.dev",
  "www.rfc-editor.org",
  "github.com",
  "docs.stripe.com",
  "aws.amazon.com",
  "spec.openapis.org",
  "cheatsheetseries.owasp.org",
  "platform.claude.com",
];
const AZURE_GUIDELINES_PATH = "/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md";

// The glossary words town 2 added (#37). Each one must be tappable somewhere in town 2.
const TOWN_2_GLOSSARY_WORDS = [
  "ACID",
  "anti-pattern",
  "backwards compatible",
  "breaking change",
  "entity tag (ETag)",
  "exponential backoff",
  "GA (general availability)",
  "idempotency key",
  "Identity Provider (IdP)",
  "JSON Web Token (JWT)",
  "lost update",
  "opaque",
  "precondition",
  "rate limiting",
  "semantically equivalent",
  "server-sent events (SSE)",
  "singleton resource",
  "status monitor",
  "token bucket",
  "transient failure",
  "UUID",
];

/** Every text in a value, like the checker reads it. */
function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(texts);
  return [];
}

const bestRow = (turn: Town["scenarios"][number]["turns"][number]) =>
  turn.moves.reduce((top, row) => (row.damage > top.damage ? row : top));

const kindOf = (scenario: Town["scenarios"][number]) => scenario.kind ?? "battle";
const battles = town.scenarios.filter((scenario) => kindOf(scenario) === "battle");
const meetings = town.scenarios.filter((scenario) => kindOf(scenario) === "meeting");
const agentDiffs = town.scenarios.filter((scenario) => kindOf(scenario) === "agent-diff");

describe("town 2 content", () => {
  it("is town number 2, API design, with the two-types twist", () => {
    expect(town).toMatchObject({ id: "t02", number: 2, name: "API design", twist: { kind: "two-types" } });
  });

  it("has about 15 creatures, each with 2 to 4 moves", () => {
    expect(town.creatures.length).toBeGreaterThanOrEqual(14);
    expect(town.creatures.length).toBeLessThanOrEqual(16);
    for (const creature of town.creatures) {
      expect(creature.moves.length, creature.id).toBeGreaterThanOrEqual(2);
      expect(creature.moves.length, creature.id).toBeLessThanOrEqual(4);
    }
  });

  it("includes idempotency keys and the LLM API creature (design 4)", () => {
    const ids = town.creatures.map((c) => c.id);
    expect(ids).toContain("idempotency-key");
    expect(ids).toContain("llm-api");
  });

  it("cites a month 2 primary source on every card", () => {
    for (const item of items) {
      const url = new URL(item.card.source.url);
      expect(PRIMARY_SOURCE_HOSTS, item.id).toContain(url.host);
      // On github.com, only the Azure REST API Guidelines are a month 2 source.
      if (url.host === "github.com") expect(url.pathname, item.id).toBe(AZURE_GUIDELINES_PATH);
    }
  });

  it("spreads the right catch choice over every position, so the file order gives no hint", () => {
    const positions = items.map((item) => item.catch.correctChoice);
    expect([...new Set(positions)].sort()).toEqual([0, 1, 2, 3]);
    for (const position of [0, 1, 2, 3]) {
      const share = positions.filter((p) => p === position).length / positions.length;
      expect(share, `position ${position}`).toBeLessThan(0.4);
    }
  });

  it("asks placement questions about the first 10 creatures in catch order", () => {
    expect(town.placement.map((question) => question.creatureId)).toEqual(
      town.creatures.slice(0, 10).map((creature) => creature.id),
    );
  });

  // The battles of town 2.
  it("has at least 12 battle scenarios, enough for most days of month 2 and the Gym", () => {
    expect(battles.length).toBeGreaterThanOrEqual(12);
  });

  it("uses only moves of town 1 and town 2 creatures in its normal Battles", () => {
    const moveIds = new Set([town, townOne].flatMap((t) => t.creatures.flatMap((creature) => creature.moves.map((move) => move.id))));
    for (const scenario of battles) {
      for (const turn of scenario.turns) {
        for (const row of turn.moves) expect(moveIds.has(row.moveId), `${scenario.id}: ${row.moveId}`).toBe(true);
      }
    }
  });

  it("puts the best move in every row position, so the file order gives no hint", () => {
    const turns = town.scenarios.flatMap((scenario) => scenario.turns);
    const bestPositions = new Set(turns.map((turn) => turn.moves.indexOf(bestRow(turn))));
    expect([...bestPositions].sort()).toEqual([0, 1, 2, 3]);
  });

  it("orders scenarios by the day they can start, so early days have a battle", () => {
    // The app offers a scenario once the creature of each best move is caught, in catch order.
    // A town 1 creature (index -1) is caught before town 2 starts.
    const catchOrder = town.creatures.map((creature) => creature.id);
    const readyAfter = battles.map((scenario) =>
      Math.max(...scenario.turns.map((turn) => catchOrder.indexOf(bestRow(turn).moveId.split(".")[0]))),
    );
    expect(readyAfter).toEqual([...readyAfter].sort((a, b) => a - b));
    // The first scenario needs only the first 2 creatures: Resource-oriented design, Status codes in APIs.
    expect(readyAfter[0]).toBe(1);
  });

  it("pairs town 2 items with town 1 or town 2 items, and never pairs an item with itself", () => {
    const ownIds = new Set(items.map((item) => item.id));
    const knownIds = new Set([...ownIds, ...itemsOf(townOne).map((item) => item.id)]);
    expect(town.confusablePairs.length).toBeGreaterThan(0);
    for (const [a, b] of town.confusablePairs) {
      expect(knownIds.has(a) && knownIds.has(b), `${a} + ${b}`).toBe(true);
      expect(ownIds.has(a) || ownIds.has(b), `${a} + ${b} has no town 2 item`).toBe(true);
      expect(a).not.toBe(b);
    }
  });

  it("makes each new glossary word tappable somewhere in town 2", () => {
    const glossary = glossarySchema.parse(JSON.parse(readFileSync("content/glossary.json", "utf8"))).words;
    const townTexts = texts(town);
    for (const word of TOWN_2_GLOSSARY_WORDS) {
      expect(glossary.map((entry) => entry.word), word).toContain(word);
      const tapped = townTexts.some((text) => glossarySegments(text, glossary).some((s) => "word" in s && s.word === word));
      expect(tapped, word).toBe(true);
    }
  });
});

// Ticket #108: the v1.5 battles of town 2, on top of the rules the checker enforces for every town.
describe("town 2 battles v1.5", () => {
  const townOneCreatures = new Set(townOne.creatures.map((creature) => creature.id));
  const turns = town.scenarios.flatMap((scenario) => scenario.turns);

  it("gives every scenario a source, and every turn a Constraint, 3 Reasons and Skills", () => {
    for (const scenario of town.scenarios) {
      expect(scenario.source, scenario.id).toBeDefined();
      for (const turn of scenario.turns) {
        expect(turn.constraint, scenario.id).toBeDefined();
        expect(turn.reasons?.filter((reason) => reason.right), scenario.id).toHaveLength(1);
        expect(turn.skills?.length, scenario.id).toBeGreaterThan(0);
      }
    }
  });

  it("needs a town 1 creature in one turn of every normal Battle (design 7.5)", () => {
    for (const scenario of battles) {
      const oldTown = scenario.turns.filter((turn) => townOneCreatures.has(bestRow(turn).moveId.split(".")[0]));
      expect(oldTown.length, scenario.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("spreads the right Reason over positions 0, 1 and 2, so the file order gives no hint", () => {
    const positions = turns.map((turn) => turn.reasons!.findIndex((reason) => reason.right));
    for (const position of [0, 1, 2]) {
      const share = positions.filter((p) => p === position).length / positions.length;
      expect(share, `position ${position}`).toBeGreaterThan(0.25);
      expect(share, `position ${position}`).toBeLessThan(0.42);
    }
  });

  it("does not make the right Reason the longest one in most turns, so its length gives no hint", () => {
    const words = (text: string) => text.split(/\s+/).length;
    const longest = turns.filter((turn) => {
      const right = turn.reasons!.find((reason) => reason.right)!;
      return turn.reasons!.every((reason) => reason === right || words(right.text) > words(reason.text));
    });
    expect(longest.length / turns.length).toBeLessThanOrEqual(0.45);
  });

  it("has 4 to 8 Meeting Battles, most with a client, that train Skills 19, 20, 21 and 26", () => {
    expect(meetings.length).toBeGreaterThanOrEqual(4);
    expect(meetings.length).toBeLessThanOrEqual(8);
    expect(meetings.filter((scenario) => scenario.person === "client").length).toBeGreaterThanOrEqual(4);
    const skills = new Set(meetings.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.skills ?? [])));
    for (const skill of [19, 20, 21, 26]) expect(skills.has(skill), `Skill ${skill}`).toBe(true);
  });

  it("has 4 Agent Diff Battles that train Skills 14 and 15 and use every verdict as a best move", () => {
    expect(agentDiffs).toHaveLength(4);
    const skills = new Set(agentDiffs.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.skills ?? [])));
    expect(skills.has(14) && skills.has(15)).toBe(true);
    const verdicts = new Set(agentDiffs.flatMap((scenario) => scenario.turns.map((turn) => bestRow(turn).moveId)));
    expect([...verdicts].sort()).toEqual(["verdict.approve", "verdict.ask-for-test", "verdict.block", "verdict.narrow"]);
  });
});
