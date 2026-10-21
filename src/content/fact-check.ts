import { bestRow } from "../core/battle.ts";
import type { Creature, Move, Town } from "./schema.ts";

// The independent fact check of a content PR (ticket #96, design 8). A fresh reviewer agent gets
// the claims of a town, grouped by the page that must support each one. It opens each page once,
// and gives a verdict and a quote per claim. The report turns the verdicts into Markdown for the PR.
// Relative imports with .ts let `scripts/fact-check.mjs` run this file in Node.

/** One thing the content says, with where it lives in the file, for example t01.dns.catch. */
export type Claim = { where: string; text: string };

/** The claims one page must support. */
export type SourceGroup = { url: string; title: string; claims: Claim[] };

/** A reviewer's verdict on one claim. A verdict without a quote from the page counts for nothing. */
export type Finding = {
  where: string;
  verdict: "supported" | "wrong" | "not-on-page";
  /** Words copied from the page. */
  quote?: string;
  /** What is wrong, and what the page says instead. */
  note?: string;
};

type Source = { title: string; url: string };

/** Every claim of a town that a source must support, grouped by source, in file order. Retired content is left out. */
export function factCheckList(town: Town): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  const add = (source: Source, where: string, text: string) => {
    const group = groups.get(source.url) ?? { url: source.url, title: source.title, claims: [] };
    group.claims.push({ where, text });
    groups.set(source.url, group);
  };

  const items = new Map<string, Creature | Move>();
  for (const creature of town.creatures) {
    if (creature.retired) continue;
    for (const item of [creature, ...creature.moves.filter((move) => !move.retired)]) {
      items.set(item.id, item);
      itemClaims(town, item, add);
    }
    for (const card of [...(creature.tradeOff ? [creature.tradeOff] : []), ...(creature.decisionCards ?? [])]) {
      if (card.retired) continue;
      const right = card.reasons.find((reason) => reason.right)?.text;
      add(
        sourceOf(creature),
        `${town.id}.${card.id}`,
        `Situation: ${card.situation} Right option: ${card.options[card.rightOption]} Right Reason: ${right} Why: ${card.explanation}`,
      );
    }
  }

  for (const scenario of town.scenarios) {
    if (scenario.retired) continue;
    scenario.turns.forEach((turn, index) => {
      const best = bestRow(turn);
      const move = items.get(best.moveId);
      const name = move ? `${move.name} (${best.moveId})` : (best.label ?? best.moveId);
      const parts = [
        `Threat: ${turn.threat}`,
        turn.constraint && `Constraint: ${turn.constraint}`,
        `Best move: ${name}. Its cost: ${best.counterattack}`,
        turn.reasons && `Right Reason: ${turn.reasons.find((reason) => reason.right)?.text}`,
        `Model answer: ${turn.modelAnswer}`,
        `Key points: ${turn.keyPoints.join(" | ")}`,
      ];
      // A v1.5 scenario cites its real incident. An older one is checked against its best move's page.
      const source = scenario.source ?? (move && sourceOf(move));
      if (source) add(source, `${town.id}.${scenario.id}.turns.${index}`, parts.filter(Boolean).join(" "));
    });
  }
  return [...groups.values()];
}

function itemClaims(town: Town, item: Creature | Move, add: (source: Source, where: string, text: string) => void) {
  const at = `${town.id}.${item.id}`;
  const card = item.card.source;
  add(card, `${at}.card.text`, item.card.text);
  add(card, `${at}.card.example`, item.card.example);
  add(
    sourceOf(item),
    `${at}.catch`,
    `Q: ${item.catch.question} Right answer: ${item.catch.choices[item.catch.correctChoice]}. Why: ${item.catch.explanation}`,
  );
  add(card, `${at}.review`, `Q: ${item.review.question} A: ${item.review.answer}`);
  if ("workedExample" in item) {
    const { problem, steps, answer } = item.workedExample;
    add(card, `${at}.workedExample`, `Problem: ${problem} Steps: ${steps.join(" ")} Answer: ${answer}`);
  }
  item.lesson?.screens.forEach((screen, i) => add(item.lesson!.source, `${at}.lesson.screens.${i}`, screen.text));
}

/** The page a learner reads before the question: the Lesson's source, or the card's for older content. */
function sourceOf(item: Creature | Move): Source {
  return item.lesson?.source ?? item.card.source;
}

/** The fact-check report as Markdown, for a PR comment. Problems come first; supported claims fold away. */
export function formatFactCheckReport(townId: string, groups: SourceGroup[], findings: Finding[]): string {
  const byWhere = new Map(findings.map((finding) => [finding.where, finding]));
  const titleOf = new Map(groups.flatMap((group) => group.claims.map((claim) => [claim.where, group.title])));
  const supported: string[] = [];
  const wrong: string[] = [];
  const byHand: string[] = [];

  for (const claim of groups.flatMap((group) => group.claims)) {
    const finding = byWhere.get(claim.where);
    const quote = finding?.quote?.trim();
    if (!finding) byHand.push(`- \`${claim.where}\`: check by hand. No reviewer checked it.`);
    else if (!quote) byHand.push(`- \`${claim.where}\`: check by hand. The reviewer gave no quote.`);
    else if (finding.verdict === "supported") supported.push(`- \`${claim.where}\`: "${oneLine(quote)}"`);
    else {
      const note = finding.note ? `${oneLine(finding.note)} ` : "";
      wrong.push(`- \`${claim.where}\`: ${note}Page: "${oneLine(quote)}" (${titleOf.get(claim.where)})`);
    }
  }

  const lines = [
    `# Fact check report: ${townId}`,
    "",
    `${groups.length} page(s), ${supported.length + wrong.length + byHand.length} claim(s).`,
    "",
    "| Result | Claims |",
    "| --- | --- |",
    `| Supported, with a quote | ${supported.length} |`,
    `| Wrong or not on the page | ${wrong.length} |`,
    `| Check by hand | ${byHand.length} |`,
    "",
  ];
  if (wrong.length === 0 && byHand.length === 0) lines.push("Every claim is supported by a quote from its page.", "");
  if (wrong.length > 0) lines.push("## Wrong or not on the page", "", ...wrong, "");
  if (byHand.length > 0) lines.push("## Check by hand", "", ...byHand, "");
  if (supported.length > 0) {
    lines.push("<details>", `<summary>Supported (${supported.length})</summary>`, "", ...supported, "", "</details>", "");
  }
  return lines.join("\n");
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
