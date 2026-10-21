import { describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";
import { fixtureTown, fixtureTownV2, fixtureTwistTown } from "./fixture-town.ts";
import { townSchema } from "./schema.ts";

const town = () => townSchema.parse(fixtureTown());

describe("buildBundle", () => {
  it("gives every creature, move and placement question a content hash", () => {
    const [bundled] = buildBundle([town()]).towns;
    const [cache] = bundled.creatures;
    expect(cache.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(cache.moves[0].hash).toMatch(/^[0-9a-f]{16}$/);
    expect(bundled.placement[0].hash).toMatch(/^[0-9a-f]{16}$/);
    expect(new Set([cache.hash, cache.moves[0].hash, bundled.creatures[1].hash]).size).toBe(3);
  });

  it("keeps the hash when only the key order in the file changes", () => {
    const reordered = town();
    const card = reordered.creatures[0].card;
    reordered.creatures[0].card = { source: card.source, example: card.example, text: card.text };
    expect(buildBundle([reordered]).towns[0].creatures[0].hash).toBe(buildBundle([town()]).towns[0].creatures[0].hash);
  });

  it("changes the hash when the text changes", () => {
    const edited = town();
    edited.creatures[0].review.answer = "A saved copy of a response.";
    expect(buildBundle([edited]).towns[0].creatures[0].hash).not.toBe(buildBundle([town()]).towns[0].creatures[0].hash);
  });

  it("keeps a creature's hash when only one of its moves changes", () => {
    const edited = town();
    edited.creatures[0].moves[0].review.answer = "How long a copy stays fresh.";
    const before = buildBundle([town()]).towns[0].creatures[0];
    const after = buildBundle([edited]).towns[0].creatures[0];
    expect(after.hash).toBe(before.hash);
    expect(after.moves[0].hash).not.toBe(before.moves[0].hash);
  });

  it("keeps the hash when only the display name changes", () => {
    const renamed = town();
    renamed.creatures[0].name = "Caching";
    expect(buildBundle([renamed]).towns[0].creatures[0].hash).toBe(buildBundle([town()]).towns[0].creatures[0].hash);
  });

  it("gives every battle scenario a hash that changes with its move table, not with its name", () => {
    const [scenario] = buildBundle([town()]).towns[0].scenarios;
    expect(scenario.hash).toMatch(/^[0-9a-f]{16}$/);

    const renamed = town();
    renamed.scenarios[0].name = "Big sale";
    expect(buildBundle([renamed]).towns[0].scenarios[0].hash).toBe(scenario.hash);

    const edited = town();
    edited.scenarios[0].turns[0].moves[1].damage = 0;
    expect(buildBundle([edited]).towns[0].scenarios[0].hash).not.toBe(scenario.hash);
  });

  it("changes a battle's hash when its second type or a turn's threat type changes (#36)", () => {
    const twist = () => townSchema.parse(fixtureTwistTown());
    const before = buildBundle([twist()]).towns[0].scenarios[0].hash;

    const secondType = twist();
    secondType.scenarios[0].secondType = "data";
    expect(buildBundle([secondType]).towns[0].scenarios[0].hash).not.toBe(before);

    const threatType = twist();
    threatType.scenarios[0].turns[2].threatType = "security";
    expect(buildBundle([threatType]).towns[0].scenarios[0].hash).not.toBe(before);
  });

  it("carries the town's twist, so the game rules can apply it", () => {
    expect(buildBundle([townSchema.parse(fixtureTwistTown())]).towns[0].twist).toEqual({ kind: "two-types" });
    expect(buildBundle([town()]).towns[0].twist).toBeUndefined();
  });

  it("carries the glossary, so the app can show a definition on tap", () => {
    const glossary = [{ word: "response", definition: "The message a server sends back to a request." }];
    expect(buildBundle([town()], glossary).glossary).toEqual(glossary);
    expect(buildBundle([town()]).glossary).toEqual([]);
  });

  it("carries the weekend boss of each town", () => {
    const boss = { title: "Boss", situation: [{ kind: "paragraph" as const, text: "A shop breaks." }], mermaidStarter: "graph TD", coachPrompt: null, modelAnswer: null };
    expect(buildBundle([town()], [], [{ townId: "t99", boss, adrCoachPrompt: null }]).weekends).toEqual([{ townId: "t99", boss, adrCoachPrompt: null }]);
    expect(buildBundle([town()]).weekends).toEqual([]);
  });

  describe("v1.5 content (#93)", () => {
    const v2 = () => townSchema.parse(fixtureTownV2());
    const v1Cache = () => buildBundle([town()]).towns[0].creatures[0];

    it("keeps the hash of a creature and its moves when only the sprite is added", () => {
      const placed = town();
      Object.assign(placed.creatures[0], { sprite: 12 });
      const after = buildBundle([placed]).towns[0].creatures[0];
      expect(after.hash).toBe(v1Cache().hash);
      expect(after.moves[0].hash).toBe(v1Cache().moves[0].hash);
    });

    it("changes the hash of an item when its Lesson is added, because the learner reads it", () => {
      const [cache] = buildBundle([v2()]).towns[0].creatures;
      expect(cache.hash).not.toBe(v1Cache().hash);
      expect(cache.moves[0].hash).not.toBe(v1Cache().moves[0].hash);
    });

    it("gives the trade-off question and each Decision Card their own hash, outside the creature's hash", () => {
      const [cache] = buildBundle([v2()]).towns[0].creatures;
      expect(cache.tradeOff?.hash).toMatch(/^[0-9a-f]{16}$/);
      expect(cache.decisionCards?.[0].hash).toMatch(/^[0-9a-f]{16}$/);

      const edited = v2();
      edited.creatures[0].decisionCards![0].explanation = "A long TTL saves a download.";
      const after = buildBundle([edited]).towns[0].creatures[0];
      expect(after.hash).toBe(cache.hash);
      expect(after.decisionCards?.[0].hash).not.toBe(cache.decisionCards?.[0].hash);
    });

    it("changes a scenario's hash with its Constraints and Reasons", () => {
      const before = buildBundle([v2()]).towns[0].scenarios[0];
      const edited = v2();
      edited.scenarios[0].turns[0].constraint = "The logo changes every day.";
      expect(buildBundle([edited]).towns[0].scenarios[0].hash).not.toBe(before.hash);
    });
  });
});
