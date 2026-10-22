import { describe, expect, it } from "vitest";
import type { ScenarioKind } from "../content/schema.ts";
import { battleKindOn, WEEKLY_KINDS, type KindRecord } from "./battle-week.ts";
import { addDays } from "./day.ts";

// Design 3: 1 or 2 Meeting Battles a week, in place of a normal Battle. 2026-10-19 is a Monday.
const MONDAY = "2026-10-19";
const day = (offset: number) => addDays(MONDAY, offset);

let next = 0;
const record = (learningDay: string, kind?: ScenarioKind): KindRecord => ({ battleId: `b${next++}`, learningDay, kind });
/** One normal Battle in the week before, so the learner knows how a Battle works. */
const knowsBattles = [record(day(-3))];

/** Plays one Battle on each of these days, of the kind the rule gives, and returns the kinds. */
function playWeek(days: number[], history: KindRecord[] = knowsBattles, kinds = WEEKLY_KINDS) {
  const played = [...history];
  return days.map((offset) => {
    const kind = battleKindOn({ today: day(offset), battles: played, weeklyKinds: kinds });
    played.push(record(day(offset), kind));
    return kind;
  });
}

describe("the week rule for Meeting Battles (design 3)", () => {
  it("gives a normal Battle until the learner played a normal Battle on an earlier day", () => {
    expect(battleKindOn({ today: day(1), battles: [] })).toBe("battle");
    // A Battle today does not count: the rule looks at earlier days only.
    expect(battleKindOn({ today: day(1), battles: [record(day(1))] })).toBe("battle");
    expect(battleKindOn({ today: day(2), battles: [record(day(1), "meeting")] })).toBe("battle");
  });

  it("makes the week's first Battle day a Meeting day, on any weekday", () => {
    expect(battleKindOn({ today: MONDAY, battles: knowsBattles })).toBe("meeting");
    expect(battleKindOn({ today: day(3), battles: knowsBattles })).toBe("meeting");
    expect(battleKindOn({ today: day(6), battles: knowsBattles })).toBe("meeting");
  });

  it("gives a learner who battles every day a Meeting on Monday and Thursday: 2 a week", () => {
    expect(playWeek([0, 1, 2, 3, 4, 5, 6])).toEqual(["meeting", "battle", "battle", "meeting", "battle", "battle", "battle"]);
  });

  it("gives a learner who battles 3 days a week 1 Meeting, and one who battles once a week 1 too", () => {
    expect(playWeek([1, 3, 5])).toEqual(["meeting", "battle", "battle"]);
    expect(playWeek([4])).toEqual(["meeting"]);
  });

  it("never gives more than 2 in a week, and starts again on Monday", () => {
    const kinds = playWeek([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(kinds.slice(0, 7).filter((kind) => kind === "meeting")).toHaveLength(2);
    expect(kinds.slice(7)).toEqual(["meeting", "battle", "battle", "meeting"]);
  });

  it("moves the Meeting to the next Battle day when a Meeting day fell back to a normal Battle", () => {
    // Monday was a Meeting day, but no Meeting Battle was ready, so a normal Battle was played.
    const history = [...knowsBattles, record(MONDAY, "battle")];
    expect(battleKindOn({ today: day(1), battles: history })).toBe("meeting");
  });

  it("is pure: the same history gives the same day, in any order, and today's own Battle changes nothing", () => {
    const history = [...knowsBattles, record(MONDAY, "meeting"), record(day(1)), record(day(2))];
    const today = day(3);
    expect(battleKindOn({ today, battles: history })).toBe("meeting");
    expect(battleKindOn({ today, battles: [...history].reverse() })).toBe("meeting");
    expect(battleKindOn({ today, battles: [...history, record(today, "meeting")] })).toBe("meeting");
  });

  it("counts an old turn with no kind, from before v2, as a normal Battle", () => {
    expect(battleKindOn({ today: MONDAY, battles: [{ battleId: "old", learningDay: day(-1) }] })).toBe("meeting");
  });

  it("lets a later kind join the week without moving a Meeting day (#106)", () => {
    const withAgentDiff = [...WEEKLY_KINDS, { kind: "agent-diff" as const, battleDays: [1] }];
    const everyDay = [0, 1, 2, 3, 4, 5, 6];
    const meetingDays = (kinds: ScenarioKind[]) => kinds.flatMap((kind, i) => (kind === "meeting" ? [i] : []));
    const before = playWeek(everyDay);
    const after = playWeek(everyDay, knowsBattles, withAgentDiff);
    expect(meetingDays(after)).toEqual(meetingDays(before));
    expect(after.filter((kind) => kind === "agent-diff")).toHaveLength(1);
  });
});
