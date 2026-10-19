import { describe, expect, it } from "vitest";
import { checkContent } from "./check.ts";
import { fixtureGlossary, fixtureLedger, fixtureTown } from "./fixture-town.ts";

function check(town: unknown = fixtureTown(), ledger = fixtureLedger, glossary: unknown = fixtureGlossary()) {
  return checkContent({ towns: [town], ledger, glossary });
}

const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(" ");

describe("checkContent", () => {
  it("accepts the fixture town", () => {
    expect(check()).toEqual([]);
  });

  it("fails when an item has no primary source link", () => {
    const town = fixtureTown();
    delete (town.creatures[0].moves[0].card as { source?: unknown }).source;
    expect(check(town)).toEqual([
      { where: "t99.creatures.0.moves.0.card.source", message: expect.any(String) },
    ]);
  });

  it("fails when the source link is not https", () => {
    const town = fixtureTown();
    town.creatures[1].card.source = { title: "Old page", url: "http://example.com/cookies" };
    expect(check(town)).toEqual([
      { where: "t99.creatures.1.card.source.url", message: "The primary source needs an https link." },
    ]);
  });

  it("fails when an id that shipped is missing", () => {
    const town = fixtureTown();
    town.creatures[0].moves = [];
    expect(check(town)).toEqual([
      { where: "ledger", message: "cache.ttl shipped before, but it is missing. Mark it retired instead of deleting it." },
    ]);
  });

  it("allows a retired item, which stays in the file", () => {
    const town = fixtureTown();
    Object.assign(town.creatures[0].moves[0], { retired: true });
    expect(check(town)).toEqual([]);
  });

  it("fails when an id is not in the ledger yet", () => {
    const town = fixtureTown();
    town.creatures[1].moves.push({ ...structuredClone(town.creatures[0].moves[0]), id: "cookie.secure", name: "Secure" });
    expect(check(town)).toEqual([
      { where: "t99.cookie.secure", message: "cookie.secure is not in content/ledger.json. Run `npm run content:build`." },
    ]);
  });

  it("fails when two items share an id", () => {
    const town = fixtureTown();
    town.creatures[1].id = "cache";
    expect(check(town, fixtureLedger.filter((id) => id !== "cookie"))).toContainEqual({
      where: "t99.cache",
      message: "The id cache is used more than once.",
    });
  });

  it("fails when a move id does not start with its creature id", () => {
    const town = fixtureTown();
    town.creatures[0].moves[0].id = "cookie.ttl";
    expect(check(town, [...fixtureLedger.filter((id) => id !== "cache.ttl"), "cookie.ttl"])).toEqual([
      { where: "t99.cookie.ttl", message: "A move of cache must have an id that starts with cache." },
    ]);
  });

  it("fails when a card is over 150 words", () => {
    const town = fixtureTown();
    // 16 sentences of 10 words, plus the 13-word example: no sentence is too long, but the card is.
    town.creatures[0].card.text = Array.from({ length: 16 }, () => `${words(10)}.`).join(" ");
    expect(check(town)).toEqual([
      { where: "t99.cache.card", message: "The card has 173 words. The limit is 150, with the example." },
    ]);
  });

  it("fails when a sentence is over 20 words", () => {
    const town = fixtureTown();
    town.creatures[1].review.answer = `Short sentence. ${words(21)}.`;
    expect(check(town)).toEqual([
      { where: "t99.cookie.review.answer", message: "A sentence has 21 words. The limit is 20: \"word0 word1 word2 …\"" },
    ]);
  });

  it("checks sentences in glossary definitions too", () => {
    const glossary = { words: [{ word: "header", definition: `${words(25)}.` }] };
    expect(check(fixtureTown(), fixtureLedger, glossary)).toEqual([
      { where: "glossary.header", message: "A sentence has 25 words. The limit is 20: \"word0 word1 word2 …\"" },
    ]);
  });

  it("fails when a placement question names a creature that does not exist", () => {
    const town = fixtureTown();
    town.placement[0].creatureId = "dns";
    expect(check(town)).toEqual([
      { where: "t99.placement.0", message: "dns is not a creature of t99." },
    ]);
  });

  it("fails when a confusable pair names an item that does not exist", () => {
    const town = fixtureTown();
    town.confusablePairs = [["cache", "cors"]];
    expect(check(town)).toEqual([
      { where: "t99.confusablePairs.0", message: "cors is not a creature or move in any town." },
    ]);
  });
});
