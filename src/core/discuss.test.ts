import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTown } from "@/content/fixture-town";
import { townSchema, type Card } from "@/content/schema";
import { playTurn, startBattle, type BattleState } from "./battle.ts";
import { COACH_PROMPT, discussPackage, teachBackFor, teachBackItems, type TeachBackRecord } from "./discuss.ts";
import type { ReviewRecord } from "./review.ts";

// The fixture scenario "t99-sale-day": the best moves are cache.ttl, cache.no-store and proxy.cdn.
const town = () => buildBundle([townSchema.parse(fixtureTown())]).towns[0];

/** Names and cards of the fixture town, as the app's content gives them. */
function itemOf(id: string): { name: string; card: Card } | undefined {
  for (const creature of town().creatures) {
    if (creature.id === id) return creature;
    const move = creature.moves.find((m) => m.id === id);
    if (move) return move;
  }
  return undefined;
}

function battleOf(team: string[], moves: (string | null)[]): BattleState {
  const offer = { scenario: town().scenarios[0], team: { size: team.length, choices: ["cache", "cookie", "proxy"] } };
  return moves.reduce((battle, moveId) => playTurn(battle, moveId), startBattle(offer, team));
}

const WON_PACKAGE = `Privacy reminder: this text goes to your personal Claude account. Before you send it, remove client names, company code and internal numbers.

You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my why. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.

# My battle: Sale day

- Opponent type: Traffic
- Problem: A sale starts at noon. Ten times more people open the shop.
- My team: Cache, Cookie, Proxy
- Result: I won in 2 turns.

## Turn 1

- Threat: Every visitor downloads the same logo and styles again.
- My move: TTL (Cache)
- My why: The logo rarely changes, so a copy can live for an hour.
- Damage: Strong hit · 2 ●●
- Counterattack: You chose TTL. The logo loads fast, but a new logo takes an hour to show.
- Key points I said: 2 of 3

## Turn 2

- Threat: The new sale price does not show. Visitors see the old price.
- My move: No store (Cache)
- My why: A price must never come from an old copy.
- Damage: Strong hit · 2 ●●
- Counterattack: You chose No store. Prices are fresh, but each price check now reaches the server.
- Key points I said: 0 of 3

# Model answer (do not show it yet)

## Turn 1

Give the logo and styles a long TTL. Browsers keep a copy, so the server sends each file once.

- [x] The logo and styles rarely change.
- [ ] A TTL lets browsers reuse their copy.
- [x] A new logo shows only after the TTL ends.

## Turn 2

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
  it("holds the whole battle, the hidden model answer with the ticks, the cards and the coach prompt", () => {
    const battle = battleOf(["cache", "cookie", "proxy"], ["cache.ttl", "cache.no-store"]);
    const text = discussPackage({
      battle,
      whys: { 1: "The logo rarely changes, so a copy can live for an hour.", 2: "A price must never come from an old copy." },
      ticks: { 1: [1, 3], 2: [] },
      itemOf,
    });
    expect(text).toBe(WON_PACKAGE);
  });

  it("copies the coach prompt of design section 10 word for word", () => {
    expect(COACH_PROMPT).toBe(
      "You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my why. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.",
    );
  });

  it("tells a loss, a turn with no move, and each card once", () => {
    // A team without Proxy that never picks the best move.
    const offer = { scenario: town().scenarios[0], team: { size: 2, choices: ["cache", "cookie"] } };
    const lost = ["cookie.http-only", "cache.ttl", "cookie.http-only"].reduce(
      (state, moveId) => playTurn(state, moveId),
      startBattle(offer, ["cache", "cookie"]),
    );
    const text = discussPackage({ battle: lost, whys: { 1: "a", 2: "b", 3: "c" }, ticks: { 1: [], 2: [2], 3: [] }, itemOf });

    expect(text).toContain("- My team: Cache, Cookie\n- Result: I lost. The opponent still had HP 4 of 4 after 3 turns.");
    expect(text).toContain("- My move: HttpOnly (Cookie)\n- My why: c\n- Damage: No effect · 0 ○○");
    // The best moves of the 3 turns: TTL, No store, CDN. Each card shows once.
    expect(text.match(/^## (TTL|No store|CDN)$/gm)).toEqual(["## TTL", "## No store", "## CDN"]);
  });

  it("says so when the team had no move for a threat", () => {
    const offer = { scenario: town().scenarios[0], team: { size: 1, choices: ["cookie"] } };
    // Turn 2's moves are all Cache and Proxy moves, so a Cookie-only team has none.
    const battle = playTurn(playTurn(startBattle(offer, ["cookie"]), "cookie.http-only"), null);
    const text = discussPackage({ battle, whys: { 1: "x", 2: "none fits" }, ticks: {}, itemOf });
    expect(text).toContain(
      "- My move: none of my moves fit this threat\n- My why: none fits\n- Damage: No effect · 0 ○○\n- Counterattack: You had no move for this threat. Nothing changes.",
    );
  });

  it("holds nothing about the learner but their own words: no battle id, no email", () => {
    const battle = battleOf(["cache", "cookie", "proxy"], ["cache.ttl", "cache.no-store"]);
    const text = discussPackage({ battle, whys: { 1: "x", 2: "y" }, ticks: {}, itemOf });
    expect(text.startsWith("Privacy reminder:")).toBe(true);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(text).not.toContain("@");
  });
});

describe("teachBackItems", () => {
  it("are the best moves of the played turns and their creatures, each once", () => {
    expect(teachBackItems(battleOf(["cache", "cookie", "proxy"], ["cache.ttl", "proxy.cdn"]))).toEqual([
      "cache.ttl",
      "cache",
      "cache.no-store",
    ]);
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
