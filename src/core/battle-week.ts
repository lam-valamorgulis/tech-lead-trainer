// The week rule for battle kinds (design 3, ticket #105). Pure functions: no clock, no database.
// A 15- or 45-minute day has one Battle. On some days of the week, that Battle is a Meeting
// Battle instead of a normal one. Nothing about the plan is saved: the kind of a day follows
// from the battle log, so a change to this rule changes only the days still to come.
import type { ScenarioKind } from "../content/schema.ts";
import type { BattleRecord } from "./battle.ts";
import type { LearningDay } from "./day.ts";
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
 * Earlier kinds come first. A later kind (#106 adds Agent Diff Battle) goes after Meeting
 * Battle, so it only takes a day that is not a Meeting day, and no Meeting day moves.
 */
export const WEEKLY_KINDS: readonly WeeklyKind[] = [{ kind: "meeting", battleDays: [0, 3] }];

/** What the rule needs from the battle log: one record per battle. No kind: a battle from before v2, a normal one. */
export type KindRecord = Pick<BattleRecord, "battleId" | "learningDay" | "kind">;

/**
 * The kind of today's Battle. It reads only the battles of earlier days, so the answer for a
 * day stays the same after that day's Battle is played.
 *
 * - Before the learner's first normal Battle, every day is a normal Battle day: the learner
 *   meets the Battle rules (Constraint, Reason, HP) on a normal Battle first.
 * - A kind is due when this week has had fewer Battles of that kind than its Battle days
 *   so far, today included. So a Meeting day that fell back to a normal Battle (no Meeting
 *   Battle was ready) moves to the next Battle day.
 */
export function battleKindOn({
  today,
  battles,
  weeklyKinds = WEEKLY_KINDS,
}: {
  today: LearningDay;
  battles: KindRecord[];
  weeklyKinds?: readonly WeeklyKind[];
}): ScenarioKind {
  const earlier = battles.filter((battle) => battle.learningDay < today);
  if (!earlier.some((battle) => (battle.kind ?? "battle") === "battle")) return "battle";
  const monday = weekStart(today);
  const thisWeek = earlier.filter((battle) => battle.learningDay >= monday);
  // Today's place among this week's Battle days: 0 when no Battle was played this week yet.
  const battleDay = new Set(thisWeek.map((battle) => battle.learningDay)).size;
  for (const { kind, battleDays } of weeklyKinds) {
    const due = battleDays.filter((index) => index <= battleDay).length;
    const played = new Set(thisWeek.filter((battle) => battle.kind === kind).map((battle) => battle.battleId)).size;
    if (played < due) return kind;
  }
  return "battle";
}
