import { describe, expect, it } from "vitest";
import type { BundledScenario } from "@/content/bundle";
import { fixtureTwistTown, fixtureTownV2 } from "@/content/fixture-town";
import { townSchema, type Card } from "@/content/schema";
import { playTurnV2, startBattleV2, type BattleV2 } from "./battle-v2.ts";
import { COACH_PROMPT, discussPackage, teachBackFor, teachBackItems, type TeachBackRecord } from "./discuss.ts";
import type { ReviewRecord } from "./review.ts";

// Seam A of "Discuss in Claude" v2 (#104). The fixture "Sale day": TTL is best on turn 1 (Reason 0
// is right), No store on turn 2 (Reason 1), CDN on turn 3 (Reason 2). "Late launch" is a Meeting Battle.
const town = fixtureTownV2();
const scenario = (id: string) => ({ ...town.scenarios.find((s) => s.id === id)!, hash: "0123456789abcdef" }) as BundledScenario;
const saleDay = scenario("t99-sale-day");
const lateLaunch = scenario("t99-late-launch");

/** Names and cards of the fixture town, as the app's content gives them. */
function itemOf(id: string): { name: string; card: Card } | undefined {
  for (const creature of town.creatures) {
    if (creature.id === id) return creature;
    const move = creature.moves.find((m) => m.id === id);
    if (move) return move;
  }
  return undefined;
}

function play(battle: BattleV2, moves: [string | null, number | null][]): BattleV2 {
  return moves.reduce((state, [moveId, reason]) => playTurnV2(state, moveId, reason), battle);
}

const team = () => startBattleV2(saleDay, ["cache", "cookie", "proxy"]);

const WON_PACKAGE = `Privacy reminder: this text goes to your personal Claude account. Before you send it, remove client names, company code and internal numbers.

You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my reason. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.

# My battle: Sale day

- Kind: Battle
- Opponent type: Traffic
- Problem: A sale starts at noon. Ten times more people open the shop.
- Source: Cloudflare: What is a CDN?, https://www.cloudflare.com/learning/cdn/what-is-a-cdn/
- My team: Cache, Cookie, Proxy
- Result: I won in 2 turns.
- HP I lost: 0
- Best moves: 2 of 2
- Right Reasons: 2 of 2

## Turn 1

- Threat: Every visitor downloads the same logo and styles again.
- Constraint: The logo changes once a year.
- My move: TTL (Cache)
- My Reason: A rarely changed file is safe to keep for long. (right)
- My own words: The logo rarely changes, so a copy can live for an hour.
- Damage: Strong hit · 2 ●●
- Counterattack: You chose TTL. The logo loads fast, but a new logo takes an hour to show.
- HP I lost: 0
- Key points I said: 2 of 3

## Turn 2

- Threat: The new sale price does not show. Visitors see the old price.
- Constraint: The price changes every minute during the sale.
- My move: No store (Cache)
- My Reason: A price must never come from an old copy. (right)
- Damage: Strong hit · 2 ●●
- Counterattack: You chose No store. Prices are fresh, but each price check now reaches the server.
- HP I lost: 0
- Key points I said: 0 of 3

# Model answer (do not show it yet)

## Turn 1

Best move: TTL (Cache)

Give the logo and styles a long TTL. Browsers keep a copy, so the server sends each file once.

- [x] The logo and styles rarely change.
- [ ] A TTL lets browsers reuse their copy.
- [x] A new logo shows only after the TTL ends.

## Turn 2

Best move: No store (Cache)

Mark the price response no-store. Every visitor then gets the current price from the server.

- [ ] A price must never come from an old copy.
- [ ] No store stops every cache from keeping it.
- [ ] Each price check now costs a server request.

# Concept cards

## TTL

TTL means time to live. It says how long a cached copy stays fresh.

Example: max-age=3600 keeps the logo fresh for one hour.

Source: MDN: HTTP caching, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching

## No store

no-store tells caches to keep no copy. Every request goes to the server.

Example: A bank sends no-store on the account page.

Source: MDN: HTTP caching, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
`;

describe("discussPackage", () => {
  it("holds the battle, each turn's Constraint and Reason, the hidden model answer with the ticks, the cards and the coach prompt", () => {
    const battle = play(team(), [
      ["cache.ttl", 0],
      ["cache.no-store", 1],
    ]);
    const text = discussPackage({
      scenario: saleDay,
      battle,
      notes: { 1: "  The logo rarely changes, so a copy can live for an hour. ", 2: "   " },
      ticks: { 1: [1, 3], 2: [] },
      itemOf,
    });
    expect(text).toBe(WON_PACKAGE);
  });

  it("copies the coach prompt of design section 10 (v1.5) word for word", () => {
    expect(COACH_PROMPT).toBe(
      "You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my reason. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.",
    );
  });

  it("names the right Reason after a wrong one, the weaker hit, the HP lost, a Faint and the loss", () => {
    // HttpOnly (2 HP lost), TTL on turn 2 (2 more: Cache Faints), then CDN with a wrong Reason.
    const battle = play(team(), [
      ["cookie.http-only", 0],
      ["cache.ttl", 1],
      ["proxy.cdn", 0],
    ]);
    const text = discussPackage({ scenario: saleDay, battle, notes: {}, ticks: { 2: [2] }, itemOf });

    expect(text).toContain(
      "- Result: I lost. I ran out of turns. The opponent still had HP 3 of 4.\n- HP I lost: 4\n- Best moves: 1 of 3\n- Right Reasons: 2 of 3",
    );
    expect(text).toContain(
      [
        "- Constraint: Half the visitors live on another continent.",
        "- My move: CDN (Proxy)",
        "- My Reason: No store makes far pages faster. (wrong)",
        "- Right Reason: A copy near the visitor cuts the travel time.",
        "- Damage: Hit · 1 ●○ (1 weaker for the wrong Reason)",
      ].join("\n"),
    );
    expect(text).toContain("- My move: TTL (Cache)\n- My Reason: A price must never come from an old copy. (right)\n- Damage: No effect · 0 ○○");
    expect(text).toContain("- HP I lost: 2\n- Key points I said: 1 of 3");
    // The best move of each turn is in the hidden model answer only.
    expect(text.indexOf("Best move: No store (Cache)")).toBeGreaterThan(text.indexOf("# Model answer (do not show it yet)"));
    // The best moves of the 3 turns first, then the other picked move. Each card shows once.
    expect(text.slice(text.indexOf("# Concept cards")).match(/^## .+$/gm)).toEqual(["## TTL", "## No store", "## CDN", "## HttpOnly"]);
  });

  it("works for a Meeting Battle: the answer's own words, Trust and Doubt, and no team", () => {
    const battle = play(startBattleV2(lateLaunch), [
      ["answer.blame-0", 0],
      ["answer.vague-1", 1],
    ]);
    // Trust 3: the blame answer costs 2, the vague one 1, so Trust reaches 0 after turn 2.
    const text = discussPackage({ scenario: lateLaunch, battle, notes: {}, ticks: {}, itemOf });
    expect(text).toContain("- Kind: Meeting Battle\n");
    expect(text).not.toContain("- My team:");
    expect(text).toContain("- Result: I lost. My Trust reached 0. The opponent still had Doubt 4 of 4.\n- Trust I lost: 3");
    expect(text).toContain("- Constraint: The client launches on Friday.\n- My move: Say the server team was slow.");
    expect(text).toContain("- Counterattack: You chose “Say the server team was slow.” The client now doubts the whole team.");
    expect(text).toContain("- Right Reason: A clear cause and date let the client plan.");
    expect(text).toContain("Best move: Give the cause, the new date and the risk.");
    expect(text).not.toContain("# Concept cards");
  });

  it("says so when the team had no move for a threat", () => {
    // Turn 2's moves are all Cache and Proxy moves, so a Cookie-only team has none.
    const battle = play(startBattleV2(saleDay, ["cookie"]), [
      ["cookie.http-only", 0],
      [null, null],
    ]);
    const text = discussPackage({ scenario: saleDay, battle, notes: { 2: "none fits" }, ticks: {}, itemOf });
    expect(text).toContain(
      "- My move: none of my moves fit this threat\n- My own words: none fits\n- Damage: No effect · 0 ○○\n- Counterattack: You had no move for this threat. Nothing changes.",
    );
  });

  it("holds nothing about the learner but their own words: no battle id, no email", () => {
    const battle = play(team(), [
      ["cache.ttl", 0],
      ["cache.no-store", 1],
    ]);
    const text = discussPackage({ scenario: saleDay, battle, notes: { 1: "x" }, ticks: {}, itemOf });
    expect(text.startsWith("Privacy reminder:")).toBe(true);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(text).not.toContain("@");
  });

  it("names both types of a two-type opponent, and the type that attacked on each turn (#36)", () => {
    const twist = { ...townSchema.parse(fixtureTwistTown()).scenarios[0], hash: "0123456789abcdef" } as BundledScenario;
    const battle = play(startBattleV2(twist, ["rate-limit", "api-key"]), [
      ["rate-limit.quota", null],
      ["api-key.rotate", null],
    ]);
    const text = discussPackage({ scenario: twist, battle, notes: {}, ticks: {}, itemOf: () => undefined });
    expect(text).toContain("- Opponent types: Traffic and Security\n");
    expect(text).toContain("## Turn 1\n\n- Threat type: Traffic\n- Threat: One partner sends 500 requests");
    expect(text).toContain("## Turn 2\n\n- Threat type: Security\n- Threat: A leaked API key");
    // Old content has no Reasons: no Reason lines and no Right Reasons count.
    expect(text).not.toContain("Reason");
  });
});

describe("teachBackItems", () => {
  it("are the best moves of the played turns and their creatures, each once", () => {
    const battle = play(team(), [
      ["cache.ttl", 0],
      ["proxy.cdn", 1],
    ]);
    expect(teachBackItems(battle)).toEqual(["cache.ttl", "cache", "cache.no-store"]);
  });

  it("are the best answers alone in a Meeting Battle: an answer has no creature", () => {
    const battle = play(startBattleV2(lateLaunch), [["answer.facts-0", 0]]);
    expect(teachBackItems(battle)).toEqual(["answer.facts-0"]);
  });
});


describe("teachBackFor", () => {
  const teachBack = (learningDay: string, sentences: [string, string], itemIds = ["cache.ttl", "cache"]): TeachBackRecord => ({
    battleId: `b-${learningDay}`,
    scenarioId: "t99-sale-day",
    itemIds,
    sentences,
    learningDay,
  });
  const review = (itemId: string, learningDay: string): ReviewRecord => ({ itemId, learningDay, grade: "good" });

  it("shows the sentences at the next review of an item of the battle", () => {
    const saved = teachBack("2026-10-20", ["A TTL keeps a copy fresh.", "A new logo waits for the TTL."]);
    expect(teachBackFor("cache.ttl", [saved], [])).toEqual(saved);
    expect(teachBackFor("cache", [saved], [review("cache", "2026-10-20")])).toEqual(saved);
    expect(teachBackFor("proxy.cdn", [saved], [])).toBeNull();
  });

  it("stops showing them once that item was reviewed on a later day", () => {
    const saved = teachBack("2026-10-20", ["One.", "Two."]);
    expect(teachBackFor("cache.ttl", [saved], [review("cache.ttl", "2026-10-21")])).toBeNull();
    // A review of another item of the battle does not use up this one.
    expect(teachBackFor("cache", [saved], [review("cache.ttl", "2026-10-21")])).toEqual(saved);
  });

  it("shows the newest one when two battles wait for the same item", () => {
    const older = teachBack("2026-10-20", ["Old one.", "Old two."]);
    const newer = teachBack("2026-10-22", ["New one.", "New two."]);
    expect(teachBackFor("cache.ttl", [older, newer], [])).toEqual(newer);
    expect(teachBackFor("cache.ttl", [older, newer], [review("cache.ttl", "2026-10-21")])).toEqual(newer);
  });
});
