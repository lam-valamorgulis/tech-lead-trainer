// What the Battle screen v2 shows, and when (ticket #103, design 7.2 and section 9). Pure functions:
// no browser, no clock. The rules themselves live in battle-v2.ts.
import type { BundledScenario } from "../content/bundle.ts";
import { counterattackSentence, damageLabel, OPPONENT_HP, type BattleState } from "./battle.ts";
import { progressV2, type BattleV2 } from "./battle-v2.ts";
import { EFFECTS } from "./effects.ts";

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

export function turnResultText({
  battle,
  scenario,
  turnNumber,
  nameOf,
}: {
  battle: BattleV2;
  scenario: Pick<BundledScenario, "name" | "turns">;
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
  return {
    damage: damageLabel(played.damage),
    choice: counterattackSentence(played.moveId && nameOf(played.moveId), row?.counterattack ?? null),
    reason,
    hitBack: hitBackText(battle, turnNumber, scenario.name, nameOf),
  };
}

function hitBackText(battle: BattleV2, turnNumber: number, opponentName: string, nameOf: NameOf): string {
  const played = battle.played[turnNumber - 1];
  const after = progressV2({ ...battle, played: battle.played.slice(0, turnNumber) });
  if (after.won) return `${opponentName} is down!`;
  if (played.hpLost === 0) return played.bestMove ? "Best move. No hit back." : "No hit back.";
  const faints = played.fainted.map((id) => ` ${nameOf(id)} fainted!`).join("");
  const next = played.fainted.length > 0 && !after.finished && after.active ? ` ${nameOf(after.active)} comes in next.` : "";
  return `The opponent hits back: −${played.hpLost} HP.${faints}${next}`;
}

/** The team member who was in at the start of a turn: the one who takes that turn's hit. */
export function activeBefore(battle: BattleV2, turnNumber: number): string | null {
  return progressV2({ ...battle, played: battle.played.slice(0, turnNumber - 1) }).active;
}

/** The colour of an HP bar: full above two thirds, low at one third or less. */
export function hpLevel(hp: number, max: number): "full" | "mid" | "low" {
  const share = hp / max;
  if (share <= 1 / 3) return "low";
  return share <= 2 / 3 ? "mid" : "full";
}

/** The one line under "You won!" or "You lost this time" on the plain end screen. */
export function endLine(battle: BattleV2): string {
  const progress = progressV2(battle);
  if (progress.won) return `The opponent's HP reached 0 in ${battle.played.length} turns.`;
  const why = progress.lostBy === "faint" ? "All your creatures fainted." : "Out of turns.";
  return `${why} The opponent still has HP ${progress.opponentHp} of ${OPPONENT_HP}. The moves you used come back in tomorrow's review.`;
}

/**
 * The v1 shape of a v2 battle, for the parts that still read it until #104 ships: the self-check
 * of each turn (it fixes the best move for the review schedule) and "Discuss in Claude". The
 * damage is the hit after a wrong Reason, so the result in the package matches the screen.
 */
export function toV1State(scenario: BundledScenario, battle: BattleV2): BattleState {
  return {
    scenario,
    team: [...battle.team],
    turns: battle.played.map((played) => ({
      turnNumber: played.turnNumber,
      moveId: played.moveId,
      damage: played.damage,
      bestMove: played.bestMove,
      counterattack:
        played.moveId === null
          ? null
          : scenario.turns[played.turnNumber - 1].moves.find((row) => row.moveId === played.moveId)!.counterattack,
    })),
  };
}

/** The "why" of each turn for "Discuss in Claude": the learner's own words when typed, else the Reason picked. */
export function whysFor(battle: BattleV2, notes: Record<number, string>): Record<number, string> {
  return Object.fromEntries(
    battle.played.map((played) => {
      const note = notes[played.turnNumber]?.trim() ?? "";
      const reasons = battle.turns[played.turnNumber - 1].reasons;
      const picked = played.reasonIndex !== null && reasons ? reasons[played.reasonIndex].text : "";
      return [played.turnNumber, note || picked];
    }),
  );
}
