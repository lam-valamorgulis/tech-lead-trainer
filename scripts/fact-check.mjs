// The independent fact check of a content PR (ticket #96, design 8). docs/agents/fact-check.md says
// how a session runs it with fresh reviewer agents.
//   npm run fact-check -- list content/towns/t01.json --out <dir>          writes the claims, a few pages per file
//   npm run fact-check -- report content/towns/t01.json <findings.json>…  prints the Markdown report
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { factCheckList, formatFactCheckReport } from "../src/content/fact-check.ts";
import { townSchema } from "../src/content/schema.ts";

const { values: args, positionals } = parseArgs({
  options: { out: { type: "string" }, pages: { type: "string", default: "5" } },
  allowPositionals: true,
});
const [mode, townFile, ...findingFiles] = positionals;

if ((mode !== "list" && mode !== "report") || !townFile) {
  console.error("Usage: npm run fact-check -- list <town.json> --out <dir> [--pages 5]");
  console.error("       npm run fact-check -- report <town.json> <findings.json>…");
  process.exit(2);
}

const town = townSchema.parse(JSON.parse(readFileSync(townFile, "utf8")));
const groups = factCheckList(town);

if (mode === "list") {
  if (!args.out) {
    console.error("Give a folder for the claim files: --out <dir>");
    process.exit(2);
  }
  // One reviewer per part: a few pages each, so every reviewer reads each page once (design 8).
  const size = Number(args.pages);
  mkdirSync(args.out, { recursive: true });
  const parts = [];
  for (let i = 0; i < groups.length; i += size) parts.push(groups.slice(i, i + size));
  parts.forEach((part, index) => writeFileSync(join(args.out, `part-${index + 1}.json`), `${JSON.stringify(part, null, 2)}\n`));
  const claims = groups.reduce((sum, group) => sum + group.claims.length, 0);
  console.log(`${town.id}: ${claims} claim(s) on ${groups.length} page(s), in ${parts.length} part(s) in ${args.out}.`);
} else {
  const findings = findingFiles.flatMap((file) => JSON.parse(readFileSync(file, "utf8")));
  console.log(formatFactCheckReport(town.id, groups, findings));
}
