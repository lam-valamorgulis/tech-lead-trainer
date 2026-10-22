// What the Battle screen v2 shows, and when (ticket #103, design 7.2 and section 9). Pure functions:
// no browser, no clock. The rules themselves live in battle-v2.ts.
import type { BundledScenario } from "../content/bundle.ts";
import type { BattleTurn, OpponentType } from "../content/schema.ts";
import { counterattackSentence, creatureOf, damageLabel } from "./battle.ts";
import { BAR_NAMES, progressV2, type BattleV2 } from "./battle-v2.ts";
import { VERDICT_WORDS, verdictName } from "./agent-diff.ts";
import { EFFECTS } from "./effects.ts";
import { PERSON_WORDS } from "./portrait.ts";
import { scenarioTwist, threatTypeOf } from "./twist.ts";

/**
 * The type that attacks on a turn, shown above the moves (#36): only in a normal Battle of a
 * two-types town. A Meeting person does not attack with a type, even in a two-types town (#105).
 */
export function attackTypeShown(
  battle: Pick<BattleV2, "kind">,
  scenario: Pick<BundledScenario, "opponentType" | "secondType" | "turns">,
  turnIndex: number,
): OpponentType | null {
  if (battle.kind !== "battle" || !scenarioTwist(scenario)) return null;
  return threatTypeOf(scenario, turnIndex);
}

/**
 * When each effect of a played turn starts, in ms after the Reason tap. The screen sets these as
 * CSS delays, so one turn plays as one CSS sequence: your creature attacks, the opponent blinks and
 * the damage text rises, then (after a weak move) the opponent attacks back and your creature
 * blinks, then it Faints. The result panel slides up last. Null: that part does not happen.
 */
export type TurnTimeline = { hitAt: number; counterAt: number | null; faintAt: number | null; resultAt: number };

export function turnTimeline(turn: { hpLost: number; fainted: string[] }): TurnTimeline {
  const hitAt = EFFECTS.attack.durationMs;
  const afterHit = hitAt + EFFECTS.rise.durationMs;
  if (turn.hpLost === 0) return { hitAt, counterAt: null, faintAt: null, resultAt: afterHit };
  // The opponent's attack starts when the damage text is up, and its hit lands when the attack ends.
  const counterAt = afterHit + EFFECTS.attack.durationMs;
  const afterCounter = counterAt + EFFECTS.flash.durationMs;
  if (turn.fainted.length === 0) return { hitAt, counterAt, faintAt: null, resultAt: afterCounter };
  return { hitAt, counterAt, faintAt: afterCounter, resultAt: afterCounter + EFFECTS.faint.durationMs };
}

/** The text of a turn's result: the damage, "You chose X. Y happens.", the right Reason, and the hit back. */
export type TurnResultText = { damage: string; choice: string; reason: string | null; hitBack: string };

/** The display name of a creature or a move. */
export type NameOf = (id: string) => string;

/**
 * The words on a move button: the `main` words, and the small `detail` next to them. A Meeting
 * answer shows its whole line, so nothing is cut (#105). A review verdict shows its name and
 * what it does (#106). A creature move shows its name, and its creature as the detail.
 */
export function moveWords(row: BattleTurn["moves"][number], nameOf: NameOf): { main: string; detail: string | null } {
  if (row.label !== undefined) return { main: row.label, detail: null };
  const verdict = VERDICT_WORDS[row.moveId];
  if (verdict) return { main: verdict.name, detail: verdict.meaning };
  return { main: nameOf(row.moveId), detail: nameOf(creatureOf(row.moveId)) };
}

export function turnResultText({
  battle,
  scenario,
  turnNumber,
  nameOf,
}: {
  battle: BattleV2;
  /** `person` is the other side of a Meeting Battle (#105). */
  scenario: Pick<BundledScenario, "name" | "turns" | "person">;
  turnNumber: number;
  nameOf: NameOf;
}): TurnResultText {
  const played = battle.played[turnNumber - 1];
  const turn = scenario.turns[turnNumber - 1];
  const row = played.moveId === null ? null : turn.moves.find((r) => r.moveId === played.moveId)!;
  let reason: string | null = null;
  if (played.reasonCorrect === false && turn.reasons && played.rightReasonIndex !== null) {
    const weaker = played.damage < played.moveDamage ? " Your hit lost 1." : "";
    reason = `Wrong Reason. The right one: “${turn.reasons[played.rightReasonIndex].text}”${weaker}`;
  }
  // A Meeting answer is a whole sentence, so it goes in quotes, as on the end screen (#104).
  const choice =
    row?.label !== undefined
      ? `You chose “${row.label}” ${row.counterattack}`
      : counterattackSentence(played.moveId && (verdictName(played.moveId) ?? nameOf(played.moveId)), row?.counterattack ?? null);
  return {
    damage: damageLabel(played.damage),
    choice,
    reason,
    hitBack: hitBackFor(battle, turnNumber, scenario, nameOf),
  };
}

/** What the other side did back, in the words of the kind of battle. */
function hitBackFor(battle: BattleV2, turnNumber: number, scenario: Pick<BundledScenario, "name" | "person">, nameOf: NameOf): string {
  if (battle.kind === "meeting" && scenario.person) {
    const person = PERSON_WORDS[scenario.person].the;
    return aloneHitBack(battle, turnNumber, { won: `${person} has no doubt left!`, best: "Best answer", hit: `${person} pushes back` });
  }
  if (battle.kind === "agent-diff") {
    return aloneHitBack(battle, turnNumber, {
      won: "The diff has no risk left!",
      best: "Best verdict",
      hit: "The team trusts your review less",
    });
  }
  return hitBackText(battle, turnNumber, scenario.name, nameOf);
}

/** The battle as it stood after its first `turns` turns, for example before or after one turn's result. */
export function battleAfter(battle: BattleV2, turns: number): BattleV2 {
  return { ...battle, played: battle.played.slice(0, turns) };
}

function hitBackText(battle: BattleV2, turnNumber: number, opponentName: string, nameOf: NameOf): string {
  const played = battle.played[turnNumber - 1];
  const after = progressV2(battleAfter(battle, turnNumber));
  if (after.won) return `${opponentName} is down!`;
  if (played.hpLost === 0) return played.bestMove ? "Best move. No hit back." : "No hit back.";
  const faints = played.fainted.map((id) => ` ${nameOf(id)} fainted!`).join("");
  const next = played.fainted.length > 0 && !after.finished && after.active ? ` ${nameOf(after.active)} comes in next.` : "";
  return `The opponent hits back: −${played.hpLost} HP.${faints}${next}`;
}

/**
 * When You play alone, You lose Trust, not HP: the person of a Meeting Battle pushes back (#105),
 * and after a weak verdict in an Agent Diff Battle the team trusts your review less (#106).
 */
function aloneHitBack(battle: BattleV2, turnNumber: number, words: { won: string; best: string; hit: string }): string {
  const played = battle.played[turnNumber - 1];
  if (progressV2(battleAfter(battle, turnNumber)).won) return words.won;
  const trust = BAR_NAMES[battle.kind].team;
  if (played.hpLost === 0) return played.bestMove ? `${words.best}. No ${trust} lost.` : `No ${trust} lost.`;
  return `${words.hit}: −${played.hpLost} ${trust}.${played.fainted.length > 0 ? ` Your ${trust} is gone!` : ""}`;
}

/** The team member who was in at the start of a turn: the one who takes that turn's hit. */
export function activeBefore(battle: BattleV2, turnNumber: number): string | null {
  return progressV2(battleAfter(battle, turnNumber - 1)).active;
}

/** The colour of an HP bar: full above two thirds, low at one third or less. */
export function hpLevel(hp: number, max: number): "full" | "mid" | "low" {
  const share = hp / max;
  if (share <= 1 / 3) return "low";
  return share <= 2 / 3 ? "mid" : "full";
}
