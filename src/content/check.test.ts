import { describe, expect, it } from "vitest";
import { checkContent } from "./check.ts";
import {
  fixtureGlossary,
  fixtureLedger,
  fixtureLedgerV2,
  fixtureTown,
  fixtureTownV2,
  fixtureTwistLedger,
  fixtureTwistTown,
} from "./fixture-town.ts";

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

  // Ticket #36: a town can turn on one battle twist. Town 2 has "two-types": opponents with two types.
  describe("the town twist", () => {
    const withTwistTown = (twistTown: unknown = fixtureTwistTown(), town: unknown = fixtureTown()) =>
      checkContent({ towns: [town, twistTown], ledger: [...fixtureLedger, ...fixtureTwistLedger], glossary: fixtureGlossary() });

    it("accepts a two-types town next to a town with no twist", () => {
      expect(withTwistTown()).toEqual([]);
    });

    it("fails on a twist kind the game does not know", () => {
      const town = fixtureTwistTown();
      town.twist = { kind: "timed" };
      expect(withTwistTown(town).map((problem) => problem.where)).toEqual(["t98.twist.kind"]);
    });

    it("fails when a scenario in a town with no twist has a second type", () => {
      const town = fixtureTown();
      Object.assign(town.scenarios[0], { secondType: "security" });
      expect(withTwistTown(undefined, town)).toEqual([
        {
          where: "t99.t99-sale-day.secondType",
          message: "Only a town with the two-types twist has opponents with a second type.",
        },
      ]);
    });

    it("fails when a turn in a town with no twist names its threat type", () => {
      const town = fixtureTown();
      Object.assign(town.scenarios[0].turns[1], { threatType: "traffic" });
      expect(withTwistTown(undefined, town)).toEqual([
        {
          where: "t99.t99-sale-day.turns.1.threatType",
          message: "Only a town with the two-types twist names the type of each threat.",
        },
      ]);
    });

    it("fails when a scenario of a two-types town has no second type", () => {
      const town = fixtureTwistTown();
      delete (town.scenarios[0] as { secondType?: unknown }).secondType;
      expect(withTwistTown(town)).toEqual([
        { where: "t98.t98-public-api.secondType", message: "In a two-types town, every opponent has a second type." },
      ]);
    });

    it("fails when the second type is the same as the first", () => {
      const town = fixtureTwistTown();
      town.scenarios[0].secondType = "traffic";
      expect(withTwistTown(town)).toContainEqual({
        where: "t98.t98-public-api.secondType",
        message: "The second type must differ from the opponent type traffic.",
      });
    });

    it("fails when a turn of a two-types town does not say which type attacks", () => {
      const town = fixtureTwistTown();
      delete (town.scenarios[0].turns[0] as { threatType?: unknown }).threatType;
      expect(withTwistTown(town)).toEqual([
        {
          where: "t98.t98-public-api.turns.0.threatType",
          message: "In a two-types town, each turn names its threat type: traffic or security.",
        },
      ]);
    });

    it("fails when a turn attacks with a type the opponent does not have", () => {
      const town = fixtureTwistTown();
      town.scenarios[0].turns[2].threatType = "data";
      expect(withTwistTown(town)).toEqual([
        {
          where: "t98.t98-public-api.turns.2.threatType",
          message: "In a two-types town, each turn names its threat type: traffic or security.",
        },
      ]);
    });

    it("fails when one of the two types never attacks, so the opponent has two types in name only", () => {
      const town = fixtureTwistTown();
      town.scenarios[0].turns[1].threatType = "traffic";
      expect(withTwistTown(town)).toEqual([
        { where: "t98.t98-public-api", message: "Both types must attack in at least one turn. security never does." },
      ]);
    });
  });
});

describe("checkContent for v1.5 content (#93)", () => {
  const checkV2 = (town: unknown = fixtureTownV2()) => check(town, fixtureLedgerV2);
  const turn = (town: ReturnType<typeof fixtureTownV2>, index = 0) =>
    town.scenarios[0].turns[index] as Record<string, unknown> & { reasons: { text: string; right: boolean }[] };

  it("accepts the v2 fixture town, with every new field", () => {
    expect(checkV2()).toEqual([]);
  });

  it("fails when a turn of a v1.5 scenario has no Constraint", () => {
    const town = fixtureTownV2();
    delete turn(town, 1).constraint;
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-sale-day.turns.1.constraint", message: "Every turn of a v1.5 scenario has one Constraint." },
    ]);
  });

  it("accepts a Constraint of two short sentences, as in the design, but not a sentence over 20 words", () => {
    const town = fixtureTownV2();
    turn(town).constraint = "Prices change once a day. The team has 2 people.";
    expect(checkV2(town)).toEqual([]);
    turn(town).constraint = `${words(21)}.`;
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-sale-day.turns.0.constraint", message: 'A sentence has 21 words. The limit is 20: "word0 word1 word2 …"' },
    ]);
  });

  it("fails when two creatures share a sprite, also across towns", () => {
    const town = fixtureTownV2();
    town.creatures[2].sprite = 12;
    expect(checkV2(town)).toEqual([{ where: "t99.proxy", message: "Sprite 12 is already used by cache. Each creature has its own sprite." }]);
  });

  it("fails when a turn has 2 right Reasons", () => {
    const town = fixtureTownV2();
    turn(town).reasons[1].right = true;
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-sale-day.turns.0.reasons", message: "Exactly 1 of the 3 Reasons is right. Here 2 are." },
    ]);
  });

  it("fails when a turn does not have exactly 3 Reasons", () => {
    const town = fixtureTownV2();
    turn(town).reasons.pop();
    expect(checkV2(town)).toEqual([{ where: "t99.scenarios.0.turns.0.reasons", message: "There are exactly 3 Reasons." }]);
  });

  it("fails when a turn of a v1.5 scenario names no Skills, or a Skill that does not exist", () => {
    const town = fixtureTownV2();
    delete turn(town, 0).skills;
    turn(town, 2).skills = [27];
    expect(checkV2(town)).toEqual([
      { where: "t99.scenarios.0.turns.2.skills.0", message: "A Skill id is a number from 1 to 26." },
    ]);
    const missing = fixtureTownV2();
    delete turn(missing, 0).skills;
    expect(checkV2(missing)).toEqual([
      { where: "t99.t99-sale-day.turns.0.skills", message: "Every turn of a v1.5 scenario names the Skills it trains." },
    ]);
  });

  it("fails when a v1.5 scenario has no source link", () => {
    const town = fixtureTownV2();
    delete (town.scenarios[0] as { source?: unknown }).source;
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-sale-day.source", message: "A v1.5 scenario has a source link to the real incident or situation." },
    ]);
  });

  it("fails when a Lesson screen has more than 50 words", () => {
    const town = fixtureTownV2();
    town.creatures[0].lesson!.screens[1].text = `${words(50)} more.`;
    expect(checkV2(town)).toContainEqual({ where: "t99.cache.lesson.screens.1.text", message: "The screen has 51 words. The limit is 50." });
  });

  it("fails when a Lesson does not have exactly 3 screens, or has no source", () => {
    const town = fixtureTownV2();
    town.creatures[0].lesson!.screens.pop();
    delete (town.creatures[1].lesson as { source?: unknown }).source;
    expect(checkV2(town)).toEqual([
      { where: "t99.creatures.0.lesson.screens", message: "A Lesson has exactly 3 screens." },
      { where: "t99.creatures.1.lesson.source", message: expect.any(String) },
    ]);
  });

  it("fails when a diagram does not start with a Mermaid type, and lets a diagram keep its line breaks", () => {
    const town = fixtureTownV2();
    town.creatures[0].lesson!.screens[0].diagram = "Browser --> Server\nServer --> Database";
    expect(checkV2(town)).toEqual([
      {
        where: "t99.cache.lesson.screens.0.diagram",
        message: 'A diagram starts with its Mermaid type, such as flowchart LR or sequenceDiagram. This starts with "Browser".',
      },
    ]);
  });

  it("from Town 2 on, fails a v1.5 scenario with no turn whose best move is from an earlier town", () => {
    const town2 = fixtureTwistTown();
    const [publicApi] = town2.scenarios;
    Object.assign(publicApi, { source: fixtureTownV2().scenarios[0].source });
    publicApi.turns.forEach((t, i) => Object.assign(t, fixtureTownV2().scenarios[0].turns[i], { moves: t.moves, threat: t.threat }));
    const both = (second: unknown) => checkContent({ towns: [fixtureTownV2(), second], ledger: [...fixtureLedgerV2, ...fixtureTwistLedger], glossary: fixtureGlossary() });
    expect(both(town2)).toEqual([
      { where: "t98.t98-public-api", message: "From Town 2 on, one turn's best move must be a move of a creature from an earlier town." },
    ]);

    // proxy.cdn is a Town 1 move: make it the best move of the first turn.
    publicApi.turns[0].moves = [
      { moveId: "proxy.cdn", damage: 2, counterattack: "Copies near partners answer, but writes still pile up." },
      { moveId: "rate-limit.quota", damage: 1, counterattack: "The partner slows down, but its big jobs take longer." },
      { moveId: "api-key.rotate", damage: 0, counterattack: "The partner gets a new key and sends just as much." },
    ];
    expect(both(town2)).toEqual([]);
  });

  it("fails a Meeting Battle with no person, or with a move that is not a labelled answer", () => {
    const town = fixtureTownV2();
    const meeting = town.scenarios.find((s) => s.id === "t99-late-launch") as { person?: string; turns: { moves: { moveId: string; label?: string }[] }[] };
    delete meeting.person;
    meeting.turns[0].moves[0].moveId = "cache.ttl";
    delete meeting.turns[0].moves[1].label;
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-late-launch.turns.0.moves.0", message: "A Meeting Battle move is an answer: its id starts with answer." },
      { where: "t99.t99-late-launch.turns.0.moves.1", message: "A Meeting answer needs a label: the words on its button." },
      { where: "t99.t99-late-launch.person", message: "A Meeting Battle names its person: client, manager or cto." },
    ]);
  });

  it("fails an Agent Diff Battle with no diff, or with a move that is not a review verdict", () => {
    const town = fixtureTownV2();
    const agent = town.scenarios.find((s) => s.id === "t99-cache-diff") as { diff?: string; turns: { moves: { moveId: string }[] }[] };
    delete agent.diff;
    agent.turns[2].moves[1].moveId = "verdict.merge";
    expect(checkV2(town)).toEqual([
      {
        where: "t99.t99-cache-diff.turns.2.moves.1",
        message: "An Agent Diff Battle move is a review verdict: one of verdict.approve, verdict.ask-for-test, verdict.block, verdict.narrow.",
      },
      { where: "t99.t99-cache-diff.diff", message: "An Agent Diff Battle has the diff the agent wrote." },
    ]);
  });

  it("fails a normal Battle with a person, a diff or a labelled move", () => {
    const town = fixtureTownV2();
    Object.assign(town.scenarios[0], { person: "client", diff: "+ x" });
    (turn(town).moves as { label?: string }[])[0].label = "Use a TTL.";
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-sale-day.turns.0.moves.0.label", message: "Only a Meeting answer has a label." },
      { where: "t99.t99-sale-day.person", message: "Only a Meeting Battle has a person." },
      { where: "t99.t99-sale-day.diff", message: "Only an Agent Diff Battle has a diff." },
    ]);
  });

  it("fails a Decision Card with a wrong id or 2 right Reasons, and keeps its id in the ledger", () => {
    const town = fixtureTownV2();
    town.creatures[0].decisionCards![0].reasons[2].right = true;
    expect(checkV2(town)).toEqual([
      { where: "t99.cache.decision.logo.reasons", message: "Exactly 1 of the 3 Reasons is right. Here 2 are." },
    ]);

    const renamed = fixtureTownV2();
    renamed.creatures[0].decisionCards![0].id = "cookie.decision.logo";
    expect(checkV2(renamed)).toEqual([
      { where: "t99.cookie.decision.logo", message: "cookie.decision.logo is not in content/ledger.json. Run `npm run content:build`." },
      { where: "ledger", message: "cache.decision.logo shipped before, but it is missing. Mark it retired instead of deleting it." },
      { where: "t99.cookie.decision.logo", message: "A card of cache must have an id that starts with cache." },
    ]);

    const badShape = fixtureTownV2();
    badShape.creatures[0].tradeOff!.id = "cache.fresh-prices";
    expect(checkV2(badShape)).toEqual([
      {
        where: "t99.creatures.0.tradeOff.id",
        message: "A trade-off question id is <creature>.trade-off.<name>, for example cache.trade-off.fresh-prices.",
      },
    ]);
  });

  it("fails a trade-off question that does not have 3 options", () => {
    const town = fixtureTownV2();
    town.creatures[0].tradeOff!.options.pop();
    expect(checkV2(town)).toEqual([{ where: "t99.creatures.0.tradeOff.options", message: "There are exactly 3 options." }]);
  });

  it("keeps the ids answer and verdict free for Meeting answers and review verdicts", () => {
    const town = fixtureTownV2();
    Object.assign(town.creatures[2], { id: "verdict" });
    town.creatures[2].moves = [];
    expect(checkV2(town)).toContainEqual({
      where: "t99.verdict",
      message: "verdict is kept for Meeting answers and review verdicts. Give the creature another id.",
    });
  });

  it("fails 2 Reasons with the same text, and a Skill named twice", () => {
    const town = fixtureTownV2();
    turn(town).reasons[2].text = turn(town).reasons[1].text;
    turn(town, 1).skills = [3, 3];
    expect(checkV2(town)).toEqual([
      { where: "t99.t99-sale-day.turns.0.reasons", message: `Two Reasons are the same: "${turn(town).reasons[1].text}". Every Reason must be different.` },
      { where: "t99.t99-sale-day.turns.1.skills", message: "A Skill is named more than once." },
    ]);
  });

  it("fails a town with more than 2 Skills", () => {
    const town = fixtureTownV2();
    town.skills = [1, 2, 3];
    expect(checkV2(town)).toEqual([{ where: "t99.skills", message: expect.any(String) }]);
  });
});
