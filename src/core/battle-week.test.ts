import { describe, expect, it } from "vitest";
import type { ScenarioKind } from "../content/schema.ts";
import { battleKindOn, dueKinds, WEEKLY_KINDS, type KindRecord } from "./battle-week.ts";
import { addDays } from "./day.ts";

// Design 3: 1 or 2 Meeting Battles a week and 1 Agent Diff Battle a week, each in place of a
// normal Battle. 2026-10-19 is a Monday.
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
    expect(playWeek([0, 1, 2, 3, 4, 5, 6])).toEqual(["meeting", "agent-diff", "battle", "meeting", "battle", "battle", "battle"]);
  });

  it("gives a learner who battles 3 days a week 1 Meeting, and one who battles once a week 1 too", () => {
    expect(playWeek([1, 3, 5])).toEqual(["meeting", "agent-diff", "battle"]);
    expect(playWeek([4])).toEqual(["meeting"]);
  });

  it("never gives more than 2 in a week, and starts again on Monday", () => {
    const kinds = playWeek([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(kinds.slice(0, 7).filter((kind) => kind === "meeting")).toHaveLength(2);
    expect(kinds.slice(7)).toEqual(["meeting", "agent-diff", "battle", "meeting"]);
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

  it("ignores a Battle dated after today, as after a time zone change, only in the week count", () => {
    // Today moved back to Wednesday, but a Battle was already logged on Thursday. Thursday counts as
    // a Battle day of this week; next Monday's Battle is in another week.
    const history = [...knowsBattles, record(MONDAY, "meeting"), record(day(1)), record(day(3)), record(day(7))];
    expect(battleKindOn({ today: day(2), battles: history })).toBe("meeting");
  });

  it("lists every due kind in priority order, so the caller can skip a kind with nothing ready", () => {
    // Monday's Meeting fell back to a normal Battle, so on Tuesday both kinds are due: Meeting first.
    const history = [...knowsBattles, record(MONDAY, "battle")];
    expect(dueKinds({ today: day(1), battles: history })).toEqual(["meeting", "agent-diff"]);
    expect(dueKinds({ today: MONDAY, battles: [] })).toEqual([]);
  });

  it("counts an old turn with no kind, from before v2, as a normal Battle", () => {
    expect(battleKindOn({ today: MONDAY, battles: [{ battleId: "old", learningDay: day(-1) }] })).toBe("meeting");
  });

});

describe("the week rule for Agent Diff Battles (#106, design 3)", () => {
  const meetingOnly = WEEKLY_KINDS.filter(({ kind }) => kind === "meeting");
  const daysOf = (kinds: ScenarioKind[], wanted: ScenarioKind) => kinds.flatMap((kind, i) => (kind === wanted ? [i] : []));
  /** Every way to battle on some days of one week: 127 patterns, from 1 day to all 7. */
  const allPatterns = Array.from({ length: 127 }, (_, n) => [0, 1, 2, 3, 4, 5, 6].filter((d) => ((n + 1) >> d) & 1));

  it("comes after Meeting Battle in the priority order", () => {
    expect(WEEKLY_KINDS.map(({ kind }) => kind)).toEqual(["meeting", "agent-diff"]);
  });

  it("gives exactly one Agent Diff day in every week with 2 or more Battle days: the second Battle day", () => {
    for (const days of allPatterns.filter((pattern) => pattern.length >= 2)) {
      expect(daysOf(playWeek(days), "agent-diff"), days.join(",")).toEqual([1]);
    }
  });

  it("never moves a Meeting day: the Meeting days are the same as with Meeting Battle alone", () => {
    for (const days of allPatterns) {
      expect(daysOf(playWeek(days), "meeting"), days.join(",")).toEqual(daysOf(playWeek(days, knowsBattles, meetingOnly), "meeting"));
    }
  });

  it("gives no Agent Diff Battle to a learner with only 1 Battle day a week: that day is the Meeting", () => {
    for (const offset of [0, 3, 6]) expect(playWeek([offset])).toEqual(["meeting"]);
  });

  it("starts again each week: one Agent Diff day in each of 2 weeks", () => {
    expect(playWeek([0, 2, 4, 7, 9, 11])).toEqual(["meeting", "agent-diff", "battle", "meeting", "agent-diff", "battle"]);
  });

  it("moves the Agent Diff day to the next Battle day when it fell back to a normal Battle", () => {
    // Tuesday was the Agent Diff day, but none was ready, so a normal Battle was played.
    const history = [...knowsBattles, record(MONDAY, "meeting"), record(day(1), "battle")];
    expect(battleKindOn({ today: day(2), battles: history })).toBe("agent-diff");
    // Played on Wednesday: Thursday is the second Meeting, then normal Battles.
    const after = [...history, record(day(2), "agent-diff")];
    expect(battleKindOn({ today: day(3), battles: after })).toBe("meeting");
    expect(battleKindOn({ today: day(4), battles: [...after, record(day(3), "meeting")] })).toBe("battle");
  });

  it("lets a Meeting that fell back go first: the Agent Diff Battle waits one more Battle day", () => {
    // No Meeting was ready on Monday. Tuesday is the Meeting, Wednesday the Agent Diff Battle.
    const history = [...knowsBattles, record(MONDAY, "battle")];
    expect(battleKindOn({ today: day(1), battles: history })).toBe("meeting");
    expect(battleKindOn({ today: day(2), battles: [...history, record(day(1), "meeting")] })).toBe("agent-diff");
  });

  it("waits, like the Meeting, until the learner played a normal Battle on an earlier day", () => {
    const meetingsOnly = [record(day(-3), "meeting"), record(MONDAY, "meeting")];
    expect(battleKindOn({ today: day(1), battles: meetingsOnly })).toBe("battle");
  });

  it("is pure: the same history gives the same kind, in any order, also after today's own Battle", () => {
    const history = [...knowsBattles, record(MONDAY, "meeting")];
    const today = day(1);
    expect(battleKindOn({ today, battles: history })).toBe("agent-diff");
    expect(battleKindOn({ today, battles: [...history].reverse() })).toBe("agent-diff");
    expect(battleKindOn({ today, battles: [...history, record(today, "agent-diff")] })).toBe("agent-diff");
  });
});
