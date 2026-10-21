// The independent fact check of a content PR (ticket #96, design 8). The `fact-check` skill in
// .claude/skills runs every step; docs/agents/fact-check.md says the same steps in words.
//   npm run fact-check -- list content/towns/t01.json --out <dir>                    writes the claims, a few pages per file
//   npm run fact-check -- report content/towns/t01.json <findings.json>… --verify   prints the Markdown report
//   npm run fact-check -- pr-rule                                                    the CI rule for a content PR
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { claimsDiffer, factCheckList, factReportProblem, formatFactCheckReport, pageText, quoteOnPage } from "../src/content/fact-check.ts";
import { townSchema } from "../src/content/schema.ts";

const { values: args, positionals } = parseArgs({
  options: { out: { type: "string" }, pages: { type: "string", default: "5" }, verify: { type: "boolean", default: false } },
  allowPositionals: true,
});
const [mode, townFile, ...findingFiles] = positionals;

if (mode === "pr-rule") {
  // CI, on a pull request: the files the PR changes, against its base, and the PR body.
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const base = event.pull_request.base.sha;
  const changed = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" }).split("\n").filter(Boolean);
  // A town file whose claims did not change (a sprite number, say) needs no report.
  const readTown = (text) => townSchema.parse(JSON.parse(text));
  const changedTowns = changed
    .filter((file) => /^content\/towns\/[^/]+\.json$/.test(file))
    .filter((file) => {
      let before = null;
      try {
        before = readTown(execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8" }));
      } catch {
        // A new town file: every claim is new.
      }
      try {
        return claimsDiffer(before, readTown(readFileSync(file, "utf8")));
      } catch {
        // A deleted or broken file: the content check fails on it; ask for the report too.
        return true;
      }
    });
  const problem = factReportProblem(changedTowns, event.pull_request.body ?? "");
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  console.log("Fact check report: ok.");
  process.exit(0);
}

if ((mode !== "list" && mode !== "report") || !townFile) {
  console.error("Usage: npm run fact-check -- list <town.json> --out <dir> [--pages 5]");
  console.error("       npm run fact-check -- report <town.json> <findings.json>… [--verify]");
  process.exit(2);
}

const town = townSchema.parse(JSON.parse(readFileSync(townFile, "utf8")));
const groups = factCheckList(town);

if (mode === "list") {
  const size = Number(args.pages);
  if (!args.out || !Number.isInteger(size) || size < 1) {
    console.error("Give a folder for the claim files and a whole number of pages per file: --out <dir> --pages 5");
    process.exit(2);
  }
  // One reviewer per part: a few pages each, so every reviewer reads each page once (design 8).
  // Each page's own words go next to the parts, so a reviewer quotes the page, not a summary of it.
  mkdirSync(join(args.out, "pages"), { recursive: true });
  for (const [index, group] of groups.entries()) {
    if (group.url === "") continue;
    const file = join(args.out, "pages", `page-${index + 1}.txt`);
    writeFileSync(file, `${group.title}\n${group.url}\n\n${pageText(await fetchPage(group.url))}\n`);
    group.textFile = file;
  }
  const parts = [];
  for (let i = 0; i < groups.length; i += size) parts.push(groups.slice(i, i + size));
  parts.forEach((part, index) => writeFileSync(join(args.out, `part-${index + 1}.json`), `${JSON.stringify(part, null, 2)}\n`));
  const claims = groups.reduce((sum, group) => sum + group.claims.length, 0);
  console.log(`${town.id}: ${claims} claim(s) on ${groups.length} page(s), in ${parts.length} part(s) in ${args.out}.`);
} else {
  const findings = findingFiles.flatMap((file) => JSON.parse(readFileSync(file, "utf8")));
  const checks = args.verify ? { quoteFound: await quoteChecker(groups) } : {};
  console.log(formatFactCheckReport(town.id, groups, findings, checks));
}

/** The HTML of a page, or "" when it does not load. */
async function fetchPage(url) {
  try {
    const response = await fetch(url, { headers: { "user-agent": "tech-lead-trainer fact check" } });
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
}

/**
 * Reads every cited page once and returns a check: is the finding's quote on its claim's page?
 * A reviewer reads pages through a summarising tool, so a quote can drift from the page's words.
 */
async function quoteChecker(pageGroups) {
  const pages = new Map();
  for (const group of pageGroups.filter((g) => g.url !== "")) pages.set(group.url, await fetchPage(group.url));
  const pageOf = new Map(pageGroups.flatMap((group) => group.claims.map((claim) => [claim.where, pages.get(group.url) ?? ""])));
  return (finding) => quoteOnPage(pageOf.get(finding.where) ?? "", finding.quote ?? "");
}
