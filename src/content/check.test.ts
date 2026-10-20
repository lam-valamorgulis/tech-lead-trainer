import { describe, expect, it } from "vitest";
import { checkContent } from "./check.ts";
import { fixtureGlossary, fixtureLedger, fixtureTown } from "./fixture-town.ts";

function check(town: unknown = fixtureTown(), ledger = fixtureLedger, glossary: unknown = fixtureGlossary()) {
  return checkContent({ towns: [town], ledger, glossary });
}

/** The fixture town with no battle scenario, for rules about items that a move table uses. */
function townWithoutScenarios() {
  return { ...fixtureTown(), scenarios: [] };
}
const ledgerWithoutScenarios = fixtureLedger.filter((id) => !id.startsWith("t99-"));

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
    town.creatures[0].moves.splice(0, 1);
    expect(check(town)).toContainEqual({
      where: "ledger",
      message: "cache.ttl shipped before, but it is missing. Mark it retired instead of deleting it.",
    });
  });

  it("allows a retired item, which stays in the file", () => {
    const town = townWithoutScenarios();
    Object.assign(town.creatures[0].moves[0], { retired: true });
    expect(check(town, ledgerWithoutScenarios)).toEqual([]);
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
    const town = townWithoutScenarios();
    town.creatures[0].moves[0].id = "cookie.ttl";
    expect(check(town, [...ledgerWithoutScenarios.filter((id) => id !== "cache.ttl"), "cookie.ttl"])).toEqual([
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

  it("fails when the right choice of a catch question does not exist", () => {
    const town = fixtureTown();
    town.creatures[0].catch.correctChoice = 3;
    expect(check(town)).toEqual([{ where: "t99.creatures.0.catch.correctChoice", message: expect.any(String) }]);
  });

  it("fails when a catch question has fewer than 3 choices, so a guess wins too often", () => {
    const town = fixtureTown();
    town.creatures[0].catch.choices = ["Yes", "No"];
    expect(check(town)).toEqual([{ where: "t99.creatures.0.catch.choices", message: expect.any(String) }]);
  });

  it("fails when a card has no real example", () => {
    const town = fixtureTown();
    town.creatures[1].card.example = " ";
    expect(check(town)).toEqual([{ where: "t99.creatures.1.card.example", message: expect.any(String) }]);
  });

  it("fails when a move id is not <creature>.<move>", () => {
    const town = fixtureTown();
    town.creatures[0].moves[0].id = "Cache TTL";
    expect(check(town)).toEqual([{ where: "t99.creatures.0.moves.0.id", message: expect.any(String) }]);
  });

  it("fails when a town does not have one placement question per creature, up to 10", () => {
    const town = fixtureTown();
    town.placement.pop();
    expect(check(town)).toEqual([
      { where: "t99.placement", message: "The town has 2 placement question(s). It needs 3: one per creature, up to 10." },
    ]);
  });

  it("counts a sentence that ends inside quotes or brackets", () => {
    const town = fixtureTown();
    town.creatures[0].review.answer = `The server says "${words(12)}." Then ${words(12)}.`;
    expect(check(town)).toEqual([]);
  });

  // The app shows content as plain text: a backtick shows as a backtick.
  it("fails when a text has a backtick", () => {
    const town = fixtureTown();
    town.creatures[0].moves[0].card.example = "Send `max-age=3600` to keep the logo for one hour.";
    expect(check(town)).toEqual([
      {
        where: "t99.cache.ttl.card.example",
        message: "The text has a backtick. The app shows plain text, so write the word without code marks.",
      },
    ]);
  });

  // A line break collapses into a space on screen, so the text reads wrong.
  it("fails when a text has a line break", () => {
    const town = fixtureTown();
    town.placement[1].answer = "Small data.\nThe browser sends it back.";
    expect(check(town)).toEqual([
      {
        where: "t99.placement.1.answer",
        message: "The text has a line break. The app shows plain text, so keep it on one line.",
      },
    ]);
  });

  it("checks the glossary for plain text too", () => {
    const glossary = { words: [{ word: "header", definition: "A line like `Cache-Control` at the top of a message." }] };
    expect(check(fixtureTown(), fixtureLedger, glossary)).toEqual([
      {
        where: "glossary.header.definition",
        message: "The text has a backtick. The app shows plain text, so write the word without code marks.",
      },
    ]);
  });

  // The catch screen checks the answer by its text, so two equal choices would both count as right.
  it("fails when two choices of a catch question are the same", () => {
    const town = fixtureTown();
    town.creatures[0].moves[0].catch.choices = ["A time to live", "A cookie", "A time to live"];
    expect(check(town)).toEqual([
      {
        where: "t99.cache.ttl.catch.choices",
        message: 'Two choices are the same: "A time to live". Every choice must be different.',
      },
    ]);
  });

  it("counts choices as the same when only capital letters or spaces differ", () => {
    const town = fixtureTown();
    town.creatures[1].catch.choices = ["It sends a cookie", "It reads your screen", "it sends  a Cookie"];
    expect(check(town)).toEqual([
      {
        where: "t99.cookie.catch.choices",
        message: 'Two choices are the same: "it sends  a Cookie". Every choice must be different.',
      },
    ]);
  });

  it("does not end a sentence at e.g. or i.e.", () => {
    const town = fixtureTown();
    town.creatures[0].review.answer = `Use a cache, e.g. ${words(12)} i.e. ${words(10)}.`;
    expect(check(town)).toEqual([
      { where: "t99.cache.review.answer", message: 'A sentence has 27 words. The limit is 20: "Use a cache, …"' },
    ]);
  });

  describe("battle scenarios", () => {
    it("fails when a turn has two best moves", () => {
      const town = fixtureTown();
      town.scenarios[0].turns[1].moves[1].damage = 2;
      expect(check(town)).toEqual([
        {
          where: "t99.t99-sale-day.turns.1",
          message: "The turn has 2 moves with the top damage 2. It needs exactly one best move.",
        },
      ]);
    });

    it("fails when a scenario id does not start with its town id", () => {
      const town = fixtureTown();
      town.scenarios[0].id = "t05-sale-day";
      expect(check(town, [...fixtureLedger.filter((id) => id !== "t99-sale-day"), "t05-sale-day"])).toEqual([
        { where: "t99.t05-sale-day", message: "A scenario of t99 must have an id that starts with t99-." },
      ]);
    });

    it("fails when a move table names a move that does not exist", () => {
      const town = fixtureTown();
      town.scenarios[0].turns[0].moves[2].moveId = "cookie.secure";
      expect(check(town)).toEqual([
        { where: "t99.t99-sale-day.turns.0", message: "cookie.secure is not a move in any town." },
      ]);
    });

    it("fails when a move table names a retired move, because nobody can catch it any more", () => {
      // Only "Sale day", so each problem shows once.
      const town = { ...fixtureTown(), scenarios: fixtureTown().scenarios.slice(0, 1) };
      Object.assign(town.creatures[1].moves[0], { retired: true });
      expect(check(town, [...ledgerWithoutScenarios, "t99-sale-day"])).toEqual([
        { where: "t99.t99-sale-day.turns.0", message: "cookie.http-only is retired, so it cannot be in a move table." },
        { where: "t99.t99-sale-day.turns.2", message: "cookie.http-only is retired, so it cannot be in a move table." },
      ]);
    });

    it("fails when even the best move on every turn cannot bring HP 4 to 0", () => {
      const town = fixtureTown();
      for (const turn of town.scenarios[0].turns) {
        turn.moves = turn.moves.map((row, i) => ({ ...row, damage: i === 0 ? 1 : 0 }));
      }
      expect(check(town)).toEqual([
        {
          where: "t99.t99-sale-day",
          message: "The best moves do 3 damage in total. A perfect battle must bring the opponent's HP 4 to 0.",
        },
      ]);
    });

    it("fails when a turn names the same move twice", () => {
      const town = fixtureTown();
      town.scenarios[0].turns[2].moves[2].moveId = "cache.no-store";
      expect(check(town)).toEqual([
        { where: "t99.t99-sale-day.turns.2", message: "cache.no-store is in the move table more than once." },
      ]);
    });

    it("fails when a counterattack is more than one sentence", () => {
      const town = fixtureTown();
      town.scenarios[0].turns[0].moves[0].counterattack = "The logo is fast. A new logo takes an hour.";
      expect(check(town)).toEqual([
        { where: "t99.t99-sale-day.turns.0.moves.0.counterattack", message: "A counterattack is one sentence. This has 2." },
      ]);
    });

    it("checks sentence length in the problem, the threats and the counterattacks", () => {
      const town = fixtureTown();
      town.scenarios[0].problem = `${words(21)}.`;
      town.scenarios[0].turns[1].threat = `${words(21)}.`;
      expect(check(town).map((problem) => problem.where)).toEqual([
        "t99.t99-sale-day.problem",
        "t99.t99-sale-day.turns.1.threat",
      ]);
    });

    describe("the model answer of a turn", () => {
      it("is required, with its key points", () => {
        const town = fixtureTown();
        delete (town.scenarios[0].turns[0] as { modelAnswer?: unknown }).modelAnswer;
        delete (town.scenarios[0].turns[1] as { keyPoints?: unknown }).keyPoints;
        expect(check(town).map((problem) => problem.where)).toEqual([
          "t99.scenarios.0.turns.0.modelAnswer",
          "t99.scenarios.0.turns.1.keyPoints",
        ]);
      });

      it("fails when a turn does not have exactly 3 key points", () => {
        const town = fixtureTown();
        town.scenarios[0].turns[0].keyPoints.pop();
        town.scenarios[0].turns[1].keyPoints.push("A fourth point.");
        expect(check(town)).toEqual([
          { where: "t99.scenarios.0.turns.0.keyPoints", message: "A turn has exactly 3 key points." },
          { where: "t99.scenarios.0.turns.1.keyPoints", message: "A turn has exactly 3 key points." },
        ]);
      });

      it("fails when a key point is empty", () => {
        const town = fixtureTown();
        town.scenarios[0].turns[2].keyPoints[1] = " ";
        expect(check(town).map((problem) => problem.where)).toEqual(["t99.scenarios.0.turns.2.keyPoints.1"]);
      });

      it("checks sentence length in the model answer and the key points", () => {
        const town = fixtureTown();
        town.scenarios[0].turns[0].modelAnswer = `Short first sentence. ${words(21)}.`;
        town.scenarios[0].turns[2].keyPoints[2] = `${words(21)}.`;
        expect(check(town).map((problem) => problem.where)).toEqual([
          "t99.t99-sale-day.turns.0.modelAnswer",
          "t99.t99-sale-day.turns.2.keyPoints.2",
        ]);
      });

      it("must be plain text", () => {
        const town = fixtureTown();
        town.scenarios[0].turns[1].modelAnswer = "Send the header `no-store` with every price.";
        town.scenarios[0].turns[1].keyPoints[0] = "Prices change often.\nOld prices lose trust.";
        expect(check(town).map((problem) => problem.where)).toEqual([
          "t99.scenarios.0.turns.1.modelAnswer",
          "t99.scenarios.0.turns.1.keyPoints.0",
        ]);
      });
    });
  });
});
