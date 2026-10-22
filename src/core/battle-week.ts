// The week rule for battle kinds (design 3, ticket #105). Pure functions: no clock, no database.
// A 15- or 45-minute day has one Battle. On some days of the week, that Battle is a Meeting
// Battle or an Agent Diff Battle (#106) instead of a normal one. Nothing about the plan is saved: the kind of a day follows
// from the battle log, so a change to this rule changes only the days still to come.
import type { ScenarioKind } from "../content/schema.ts";
import type { BattleRecord } from "./battle.ts";
import { addDays, type LearningDay } from "./day.ts";
import { weekStart } from "./week.ts";

/**
 * A kind of Battle that takes the place of a normal Battle on some days of each week.
 * `battleDays` are Battle days of the week, counted from 0: the learner's first day with a
 * Battle this week is 0, the next one is 1, and so on. So a learner who skips a day still
 * gets the kind, on their next Battle day.
 */
export type WeeklyKind = { kind: Exclude<ScenarioKind, "battle">; battleDays: number[] };

/**
 * Design 3: 1 or 2 Meeting Battles a week. The first and the fourth Battle day of the week are
 * Meeting days: Monday and Thursday for a learner who battles every day, and still one Meeting
 * for a learner who battles once a week.
 *
 * Design 3: 1 Agent Diff Battle a week, from Town 1 (#106). The second Battle day of the week
 * is the Agent Diff day: Tuesday for a learner who battles every day.
 *
 * Earlier kinds come first. Agent Diff Battle goes after Meeting Battle, so it only takes a
 * day that is not a Meeting day, and no Meeting day moves. The cost: a learner with only 1
 * Battle day in a week gets the Meeting on it, and no Agent Diff Battle that week.
 */
export const WEEKLY_KINDS: readonly WeeklyKind[] = [
  { kind: "meeting", battleDays: [0, 3] },
  { kind: "agent-diff", battleDays: [1] },
];

/** What the rule needs from the battle log: one record per battle. No kind: a battle from before v2, a normal one. */
export type KindRecord = Pick<BattleRecord, "battleId" | "learningDay" | "kind">;

/** What the week rule reads: today, the battle log, and the weekly kinds in priority order. */
export type WeekInput = { today: LearningDay; battles: KindRecord[]; weeklyKinds?: readonly WeeklyKind[] };

/**
 * The kinds due today in place of a normal Battle, in priority order. Empty: a normal Battle day.
 * The caller plays the first kind with a ready scenario, so a kind with nothing ready never
 * blocks a later kind (#106). It reads only the battles of other days, so the answer for a day
 * stays the same after that day's Battle is played.
 *
 * - Before the learner's first normal Battle, every day is a normal Battle day: the learner
 *   meets the Battle rules (Constraint, Reason, HP) on a normal Battle first.
 * - A kind is due when this week has had fewer Battles of that kind than its Battle days
 *   so far, today included. So a Meeting day that fell back to a normal Battle (no Meeting
 *   Battle was ready) moves to the next Battle day.
 */
export function dueKinds({ today, battles, weeklyKinds = WEEKLY_KINDS }: WeekInput): WeeklyKind["kind"][] {
  // Every day but today. A time zone change can move today earlier, so "before today" would miss days.
  const otherDays = battles.filter((battle) => battle.learningDay !== today);
  if (!otherDays.some((battle) => (battle.kind ?? "battle") === "battle")) return [];
  const monday = weekStart(today);
  const nextMonday = addDays(monday, 7);
  const thisWeek = otherDays.filter((battle) => battle.learningDay >= monday && battle.learningDay < nextMonday);
  // Today's place among this week's Battle days: 0 when no Battle was played this week yet.
  const battleDay = new Set(thisWeek.map((battle) => battle.learningDay)).size;
  return weeklyKinds
    .filter(({ kind, battleDays }) => {
      const due = battleDays.filter((index) => index <= battleDay).length;
      const played = new Set(thisWeek.filter((battle) => battle.kind === kind).map((battle) => battle.battleId)).size;
      return played < due;
    })
    .map(({ kind }) => kind);
}

/** The kind of today's Battle when every due kind has a ready scenario: the first due kind, or a normal Battle. */
export function battleKindOn(input: WeekInput): ScenarioKind {
  return dueKinds(input)[0] ?? "battle";
}
