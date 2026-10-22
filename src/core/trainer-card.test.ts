import { describe, expect, it } from "vitest";
import { SKILLS } from "../content/skills.ts";
import { cardPick, formatSkillRate, skillRates, skillsMet, turnPick, type SkillRate } from "./trainer-card.ts";

const rateOf = (rates: SkillRate[], id: number) => rates.find((rate) => rate.id === id)!;

describe("turnPick", () => {
  it("counts a turn right when the best move was picked, whatever the Reason", () => {
    expect(turnPick({ skillIds: [3], bestMove: true, reasonCorrect: false })).toEqual({ skillIds: [3], right: true });
    expect(turnPick({ skillIds: [3], bestMove: false, reasonCorrect: true })).toEqual({ skillIds: [3], right: false });
  });

  it("leaves out a turn with no logged Skills: a turn from before v2, or content with no Skills", () => {
    expect(turnPick({ skillIds: null, bestMove: true, reasonCorrect: null })).toBeNull();
    expect(turnPick({ skillIds: [], bestMove: true, reasonCorrect: null })).toBeNull();
  });
});

describe("cardPick", () => {
  it("counts a Decision Card right only when the option and the Reason are both right, as #109 grades it", () => {
    expect(cardPick({ skillIds: [3], choiceCorrect: true, reasonCorrect: true })).toEqual({ skillIds: [3], right: true });
    expect(cardPick({ skillIds: [3], choiceCorrect: true, reasonCorrect: false }).right).toBe(false);
    expect(cardPick({ skillIds: [3], choiceCorrect: false, reasonCorrect: true }).right).toBe(false);
  });
});

describe("skillRates", () => {
  it("lists the 26 Skills in their fixed id order, each never met when nothing is logged", () => {
    const rates = skillRates([]);
    expect(rates.map(({ id, name }) => ({ id, name }))).toEqual(SKILLS.map(({ id, name }) => ({ id, name })));
    expect(rates.every((rate) => rate.met === 0 && rate.right === 0)).toBe(true);
    expect(skillsMet(rates)).toBe(0);
  });

  it("is right picks / times met per Skill, from battle turns of every kind and Decision Cards", () => {
    // One Meeting Battle: 3 turns that train Skill 20 (talking with clients), with 2 best moves.
    const meeting = [
      { battleKind: "meeting", skillIds: [20], bestMove: true, reasonCorrect: true },
      { battleKind: "meeting", skillIds: [20], bestMove: false, reasonCorrect: true },
      { battleKind: "meeting", skillIds: [20, 19], bestMove: true, reasonCorrect: false },
    ] as const;
    const battle = [{ battleKind: "battle", skillIds: [3], bestMove: true, reasonCorrect: true }] as const;
    const agentDiff = [{ battleKind: "agent-diff", skillIds: [14, 15], bestMove: false, reasonCorrect: false }] as const;
    const cards = [
      { skillIds: [3], choiceCorrect: true, reasonCorrect: false },
      { skillIds: [3, 19], choiceCorrect: true, reasonCorrect: true },
    ];
    const picks = [...[...meeting, ...battle, ...agentDiff].map(turnPick), ...cards.map(cardPick)].filter((pick) => pick !== null);

    const rates = skillRates(picks);
    expect(rateOf(rates, 20)).toMatchObject({ right: 2, met: 3 });
    expect(rateOf(rates, 19)).toMatchObject({ right: 2, met: 2 });
    expect(rateOf(rates, 3)).toMatchObject({ right: 2, met: 3 });
    expect(rateOf(rates, 14)).toMatchObject({ right: 0, met: 1 });
    expect(rateOf(rates, 15)).toMatchObject({ right: 0, met: 1 });
    expect(rateOf(rates, 1)).toMatchObject({ right: 0, met: 0 });
    expect(skillsMet(rates)).toBe(5);
  });

  it("counts a Skill once per turn or card, and ignores an id outside the 26", () => {
    const rates = skillRates([{ skillIds: [7, 7, 27, 0], right: true }]);
    expect(rateOf(rates, 7)).toMatchObject({ right: 1, met: 1 });
    expect(rates).toHaveLength(26);
    expect(skillsMet(rates)).toBe(1);
  });
});

describe("formatSkillRate", () => {
  it("says the count and the rounded percent, or that the Skill is not met yet", () => {
    expect(formatSkillRate({ right: 2, met: 3 })).toBe("2 of 3 right · 67%");
    expect(formatSkillRate({ right: 0, met: 1 })).toBe("0 of 1 right · 0%");
    expect(formatSkillRate({ right: 0, met: 0 })).toBe("Not met yet");
  });
});
