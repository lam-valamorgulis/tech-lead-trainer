import { describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";
import { fixtureTown } from "./fixture-town.ts";
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
});
