import { bestRow } from "../core/battle.ts";
import type { BattleTurn, Creature, DecisionCard, Move, Scenario, Town, TradeOff } from "./schema.ts";

// The independent fact check of a content PR (ticket #96, design 8). A fresh reviewer agent gets
// the claims of a town, grouped by the page that must support each one. It opens each page once,
// and gives a verdict and a quote per claim. The report turns the verdicts into Markdown for the PR.
// Relative imports with .ts let `scripts/fact-check.mjs` run this file in Node.

/** One thing the content says, with where it lives in the file, for example t01.dns.catch. */
export type Claim = { where: string; text: string };

/**
 * The claims one page must support. The group with url "" holds the claims that have no page.
 * `textFile` is the page's own words, saved by `npm run fact-check -- list` when the page loads.
 */
export type SourceGroup = { url: string; title: string; claims: Claim[]; textFile?: string };

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

const NO_SOURCE: Source = { title: "No source", url: "" };

/**
 * Every claim of a town that a page must support, grouped by page, in file order. Retired content is left out.
 * `otherTowns` give the pages of best moves from earlier towns (design 7.5); their own cards are not listed.
 */
export function factCheckList(town: Town, otherTowns: Town[] = []): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  const add = (source: Source | undefined, where: string, text: string) => {
    const page = source ?? NO_SOURCE;
    const group = groups.get(page.url) ?? { url: page.url, title: page.title, claims: [] };
    group.claims.push({ where: `${town.id}.${where}`, text });
    groups.set(page.url, group);
  };

  if (town.intro) town.intro.screens.forEach((screen, i) => add(town.intro!.source, `intro.screens.${i}`, screen));

  const items = new Map<string, Creature | Move>();
  for (const creature of town.creatures) {
    if (creature.retired) continue;
    for (const item of [creature, ...creature.moves.filter((move) => !move.retired)]) {
      items.set(item.id, item);
      addItemClaims(item, add);
    }
    for (const card of [...(creature.tradeOff ? [creature.tradeOff] : []), ...(creature.decisionCards ?? [])]) {
      if (!card.retired) add(pageOf(creature), card.id, scoredCardText(card));
    }
  }

  town.placement.forEach((question, i) => {
    const creature = items.get(question.creatureId);
    add(creature && pageOf(creature), `placement.${i}`, `Q: ${question.question} A: ${question.answer}`);
  });

  // A turn's best move can come from an earlier town. It is checked against that move's own page.
  const moves = new Map(items);
  for (const other of otherTowns) {
    for (const creature of other.creatures) for (const item of [creature, ...creature.moves]) if (!moves.has(item.id)) moves.set(item.id, item);
  }
  for (const scenario of town.scenarios) {
    if (!scenario.retired) addScenarioClaims(scenario, moves, add);
  }
  return [...groups.values()];
}

type Add = (source: Source | undefined, where: string, text: string) => void;

function addItemClaims(item: Creature | Move, add: Add) {
  const card = item.card.source;
  add(card, `${item.id}.card.text`, item.card.text);
  add(card, `${item.id}.card.example`, item.card.example);
  add(
    pageOf(item),
    `${item.id}.catch`,
    `Q: ${item.catch.question} Right answer: ${item.catch.choices[item.catch.correctChoice]}. Why: ${item.catch.explanation}`,
  );
  add(card, `${item.id}.review`, `Q: ${item.review.question} A: ${item.review.answer}`);
  if ("workedExample" in item) {
    const { problem, steps, answer } = item.workedExample;
    add(card, `${item.id}.workedExample`, `Problem: ${problem} Steps: ${steps.join(" ")} Answer: ${answer}`);
  }
  item.lesson?.screens.forEach((screen, i) =>
    add(item.lesson!.source, `${item.id}.lesson.screens.${i}`, screen.diagram ? `${screen.text} Diagram: ${screen.diagram}` : screen.text),
  );
}

/**
 * A battle turn has two kinds of claim. Its situation (threat and Constraint) comes from the real
 * incident, so it is checked against the scenario's source. Its best move, the cost, the right
 * Reason, the model answer and the key points are engineering facts, so they are checked against
 * the best move's own page. A turn with neither page is listed with no source.
 */
function addScenarioClaims(scenario: Scenario, items: Map<string, Creature | Move>, add: Add) {
  const story = scenario.source;
  if (story) {
    add(story, `${scenario.id}.problem`, scenario.problem);
    if (scenario.diff) add(story, `${scenario.id}.diff`, `The diff has this planted problem, per the turns below: ${scenario.diff}`);
  }
  scenario.turns.forEach((turn, index) => {
    const at = `${scenario.id}.turns.${index}`;
    const constraint = turn.constraint ? ` Constraint: ${turn.constraint}` : "";
    if (story) add(story, `${at}.situation`, `Threat: ${turn.threat}${constraint}`);
    const best = bestRow(turn);
    const move = items.get(best.moveId);
    add(move ? pageOf(move) : story, at, turnText(turn, move ? `${move.name} (${best.moveId})` : (best.label ?? best.moveId)));
  });
}

function turnText(turn: BattleTurn, bestName: string): string {
  const best = bestRow(turn);
  return [
    `Threat: ${turn.threat}`,
    turn.constraint && `Constraint: ${turn.constraint}`,
    `Best move: ${bestName}. Its cost: ${best.counterattack}`,
    turn.reasons && `Right Reason: ${rightReason(turn.reasons)}`,
    `Model answer: ${turn.modelAnswer}`,
    `Key points: ${turn.keyPoints.join(" | ")}`,
  ]
    .filter(Boolean)
    .join(" ");
}

function scoredCardText(card: TradeOff | DecisionCard): string {
  return `Situation: ${card.situation} Right option: ${card.options[card.rightOption]} Right Reason: ${rightReason(card.reasons)} Why: ${card.explanation}`;
}

const rightReason = (reasons: { text: string; right: boolean }[]) => reasons.find((reason) => reason.right)?.text;

/** The page a learner reads before the question: the Lesson's source, or the card's for older content. */
function pageOf(item: Creature | Move): Source {
  return item.lesson?.source ?? item.card.source;
}

/**
 * One quote may back the claims of at most this many items. A card, its catch question and its
 * review say the same fact, so they may share a sentence. A sentence that backs more concepts than
 * this cannot prove each one.
 */
const QUOTE_REUSE_LIMIT = 2;

/** The item a claim belongs to: t01.dns.catch and t01.dns.review both belong to t01.dns. */
function itemOf(where: string): string {
  return where.replace(/\.(card\.text|card\.example|catch|review|workedExample|lesson\.screens\.\d+|situation)$/, "");
}

/** What the report knows besides the findings: whether each quote was found on its page, when the pages were read. */
export type ReportChecks = { quoteFound?: (finding: Finding) => boolean };

/**
 * The fact-check report as Markdown, for a PR comment. Problems come first; supported claims
 * fold away. Every doubt becomes "check by hand": no page, no finding, no quote, two findings,
 * a quote reused for many claims, or a quote that is not on the page.
 */
export function formatFactCheckReport(townId: string, groups: SourceGroup[], findings: Finding[], checks: ReportChecks = {}): string {
  const byWhere = Map.groupBy(findings, (finding) => finding.where);
  const quoteUses = Map.groupBy(
    findings.filter((finding) => finding.quote?.trim()),
    (finding) => oneLine(finding.quote!).toLowerCase(),
  );
  const claims = groups.flatMap((group) => group.claims.map((claim) => ({ ...claim, group })));
  const supported: string[] = [];
  const wrong: string[] = [];
  const byHand: string[] = [];

  for (const { where, group } of claims) {
    const found = byWhere.get(where) ?? [];
    const finding = found[0];
    const quote = finding?.quote ? oneLine(finding.quote) : "";
    const uses = quote ? new Set(quoteUses.get(quote.toLowerCase())!.map((f) => itemOf(f.where))).size : 0;
    const doubt =
      group.url === ""
        ? "It has no page to check it against."
        : found.length === 0
          ? "No reviewer checked it."
          : found.length > 1
            ? `It has ${found.length} findings that may disagree.`
            : !quote
              ? "The reviewer gave no quote."
              : uses > QUOTE_REUSE_LIMIT
                ? `The same quote backs claims of ${uses} different items.`
                : checks.quoteFound && !checks.quoteFound(finding)
                  ? "The quote is not on the page."
                  : null;
    if (doubt) byHand.push(`- \`${where}\`: check by hand. ${doubt}`);
    else if (finding.verdict === "supported") supported.push(`- \`${where}\`: "${quote}"`);
    else wrong.push(`- \`${where}\`: ${finding.note ? `${oneLine(finding.note)} ` : ""}Page: "${quote}" (${group.title})`);
  }

  const known = new Set(claims.map((claim) => claim.where));
  const strays = [...new Set(findings.map((finding) => finding.where).filter((where) => !known.has(where)))];

  const lines = [
    `# Fact check report: ${townId}`,
    "",
    `${groups.filter((group) => group.url !== "").length} page(s), ${claims.length} claim(s).`,
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
  if (strays.length > 0) {
    lines.push("## Findings for no claim", "", "A reviewer wrote these ids, but the town has no such claim. Check for a typo.", "");
    lines.push(...strays.map((where) => `- \`${where}\``), "");
  }
  if (supported.length > 0) {
    lines.push("<details>", `<summary>Supported (${supported.length})</summary>`, "", ...supported, "", "</details>", "");
  }
  return lines.join("\n");
}

/**
 * Whether a quote is on a page. Only letters and digits count: tags, spaces, dashes, quote marks,
 * list commas and capitals do not, because a reviewer copies a list or a table as one line.
 * The page is the raw HTML of the cited url.
 */
export function quoteOnPage(html: string, quote: string): boolean {
  const page = lettersAndDigits(pageText(html));
  // "…" joins parts of the page that are apart: each part must be there, in any order. Short parts,
  // like a header name, are fine next to a real phrase, but scraps like "the … a" never pass alone.
  const parts = quote.split(/\.\.\.|…/).map(lettersAndDigits).filter(Boolean);
  return parts.some((part) => part.length >= MIN_QUOTE_PART) && parts.every((part) => page.includes(part));
}

/** The fewest letters and digits of a quote's longest part: about three short words. */
const MIN_QUOTE_PART = 12;

/**
 * The words of a page, as a reviewer reads them: the main part of the HTML, without scripts and
 * tags, one block per line. A reviewer quotes from this text, so a quote is the page's own words.
 */
export function pageText(html: string): string {
  const main = html.match(/<main[\s>][\s\S]*<\/main>/i)?.[0] ?? html;
  return main
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|li|h[1-6]|tr|dt|dd|pre|blockquote|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function lettersAndDigits(text: string): string {
  return text
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Town fields that only change how the app draws content, never what it says. */
const DISPLAY_ONLY_FIELDS = new Set(["sprite"]);

/**
 * Whether a change to a town file needs a new fact check: any change except to display-only
 * fields, such as a sprite number. A new field is checked by default. `before` is null for a new file.
 */
export function claimsDiffer(before: Town | null, after: Town): boolean {
  const said = (town: Town) => JSON.stringify(town, (key, value) => (DISPLAY_ONLY_FIELDS.has(key) ? undefined : value));
  return before === null || said(before) !== said(after);
}

/**
 * The CI rule for content PRs (#96): a PR that changes the claims of a town file must carry the
 * fact-check report section with a link to the report comment. `changedTowns` lists the town files
 * whose claims differ from the PR's base. Null when the PR passes.
 */
export function factReportProblem(changedTowns: string[], body: string): string | null {
  const town = changedTowns.find((file) => /^content\/towns\/[^/]+\.json$/.test(file));
  if (!town) return null;
  const section = body.split(/^## /m).find((part) => part.startsWith("Fact check report"));
  if (section && /#issuecomment-\d+/.test(section)) return null;
  return `This PR changes the claims of ${town}. Its body needs a "## Fact check report" section with a link to the report comment (docs/agents/fact-check.md).`;
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
