import { describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";
import { fixtureTownV2 } from "./fixture-town.ts";
import { reviewCards } from "./scored-cards.ts";

// #109: the Decision Cards and trade-off questions review can show.

describe("reviewCards", () => {
  it("lists each Decision Card by id and each trade-off question by its creature, with the creature's art", () => {
    const { decisionCards, tradeOffs } = reviewCards(buildBundle([fixtureTownV2()]).towns);
    expect([...decisionCards.keys()]).toEqual(["cache.decision.logo"]);
    expect(decisionCards.get("cache.decision.logo")).toMatchObject({
      kind: "decision",
      hash: expect.stringMatching(/^[0-9a-f]{16}$/),
      creature: { id: "cache", name: "Cache", sprite: 12 },
    });
    expect(tradeOffs.get("cache")).toMatchObject({ id: "cache.trade-off.fresh-prices", kind: "trade-off" });
  });

  it("leaves out a retired card, and every card of a retired creature", () => {
    const retiredCard = fixtureTownV2();
    retiredCard.creatures[0].decisionCards![0].retired = true;
    retiredCard.creatures[0].tradeOff!.retired = true;
    const cards = reviewCards(buildBundle([retiredCard]).towns);
    expect(cards.decisionCards.size).toBe(0);
    expect(cards.tradeOffs.has("cache")).toBe(false);

    const retiredCreature = fixtureTownV2();
    retiredCreature.creatures[0].retired = true;
    const left = reviewCards(buildBundle([retiredCreature]).towns);
    expect(left.decisionCards.size).toBe(0);
    expect([...left.tradeOffs.keys()]).toEqual(["cookie", "proxy"]);
  });
});
