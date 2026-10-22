import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { skillRates, skillsMet, type SkillRate } from "@/core/trainer-card";
import { writeEvents, type BattleTurnEvent, type ReviewCardEvent } from "@/lib/events/write-events";
import { ensureProfile } from "@/lib/profile";
import { loadSkillPicks } from "@/lib/trainer-card-log";
import { forgetEmail, signedInUser } from "./helpers";

// Seam B for ticket #110: the Trainer Card reads the Skills logged by battle turns of every kind
// and by Decision Cards, and each learner sees only their own.

const base = () => ({
  clientEventId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  occurredAt: "2026-10-18T02:00:00.000Z",
});

/** One v2 turn of the fixture Meeting Battle (t99-late-launch), which trains Skill 20. */
function meetingTurn(battleId: string, turnNumber: number, bestMove: boolean): BattleTurnEvent {
  return {
    type: "battle-turn",
    ...base(),
    battleId,
    scenarioId: "t99-late-launch",
    contentHash: "0123456789abcdef",
    turnNumber,
    moveId: bestMove ? `answer.facts-${turnNumber - 1}` : `answer.blame-${turnNumber - 1}`,
    damage: bestMove ? 2 : 0,
    bestMove,
    battleKind: "meeting",
    moveDamage: bestMove ? 2 : 0,
    reasonIndex: 0,
    reasonCorrect: true,
    hpLost: bestMove ? 0 : 2,
    skillIds: [20],
    constraintVariant: "main",
  };
}

function decisionCard(choiceCorrect: boolean, reasonCorrect: boolean, itemKind: "decision" | "trade-off" = "decision"): ReviewCardEvent {
  return {
    type: "review-card",
    ...base(),
    itemId: itemKind === "decision" ? "cache.decision.logo" : "cache.trade-off.fresh-prices",
    itemKind,
    contentHash: "0123456789abcdef",
    choiceIndex: 0,
    choiceCorrect,
    reasonIndex: 0,
    reasonCorrect,
    skillIds: [3],
    shownAt: "2026-10-18T02:00:00.000Z",
    gradedAt: "2026-10-18T02:00:05.000Z",
    rulesVersion: "v1.5",
  };
}

const rateOf = (rates: SkillRate[], id: number) => rates.find((rate) => rate.id === id)!;

describe("Trainer Card log", () => {
  let user: { id: string; email: string; client: SupabaseClient };
  let other: { id: string; email: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await signedInUser("trainer-card");
    other = await signedInUser("trainer-card-other");
    await ensureProfile(user.client);
    await ensureProfile(other.client);
  });

  afterAll(async () => {
    await forgetEmail(user.email);
    await forgetEmail(other.email);
  });

  it("shows no Skill met for a new learner", async () => {
    expect(skillsMet(skillRates(await loadSkillPicks(user.client)))).toBe(0);
  });

  it("rates the Skills of one Meeting Battle and the Decision Cards, from the saved rows", async () => {
    const battleId = crypto.randomUUID();
    await writeEvents(user.client, [
      meetingTurn(battleId, 1, true),
      meetingTurn(battleId, 2, false),
      meetingTurn(battleId, 3, true),
      // A turn from before v2 logged no Skills: the Trainer Card leaves it out.
      {
        type: "battle-turn",
        ...base(),
        battleId: crypto.randomUUID(),
        scenarioId: "t99-sale-day",
        contentHash: "0123456789abcdef",
        turnNumber: 1,
        moveId: "cache.ttl",
        damage: 2,
        bestMove: true,
        whyText: "Old prices are fine for a minute.",
      },
      decisionCard(true, true),
      decisionCard(true, false),
      // A trade-off question is a review card too, but not a Decision Card (design 7.7).
      decisionCard(true, true, "trade-off"),
    ]);

    const rates = skillRates(await loadSkillPicks(user.client));
    expect(rateOf(rates, 20)).toMatchObject({ right: 2, met: 3 });
    expect(rateOf(rates, 3)).toMatchObject({ right: 1, met: 2 });
    expect(skillsMet(rates)).toBe(2);
  });

  it("never shows another learner's picks", async () => {
    expect(await loadSkillPicks(other.client)).toEqual([]);
  });
});
