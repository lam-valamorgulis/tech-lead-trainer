// Content checker and bundler (design 12.3). Runs in CI before the build.
//   node scripts/content.mjs check   fails on broken content or an out-of-date bundle
//   node scripts/content.mjs build   adds new ids to the ledger and writes the bundle
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildBundle } from "../src/content/bundle.ts";
import { checkContent, contentIds } from "../src/content/check.ts";
import { fixtureBossMarkdown, fixtureGlossary, fixtureTown, fixtureTwistTown } from "../src/content/fixture-town.ts";
import { parseBoss } from "../src/content/weekend.ts";
import { addNewIds } from "../src/content/ledger.ts";
import { glossarySchema, townSchema } from "../src/content/schema.ts";

const CONTENT = "content";
const LEDGER = join(CONTENT, "ledger.json");
const BUNDLE = join("src", "content", "bundle.generated.json");
// The fixture towns as a bundle, for seam C only (NEXT_PUBLIC_CONTENT_SET=fixture). Town 2 has the twist.
const FIXTURE_BUNDLE = join("src", "content", "fixture.generated.json");

const mode = process.argv[2];
if (mode !== "check" && mode !== "build") {
  console.error("Usage: node scripts/content.mjs check|build");
  process.exit(2);
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const townFiles = readdirSync(join(CONTENT, "towns"))
  .filter((name) => name.endsWith(".json"))
  .sort();
const towns = townFiles.map((name) => readJson(join(CONTENT, "towns", name)));
const glossary = readJson(join(CONTENT, "glossary.json"));
let ledger = readJson(LEDGER).ids;
// The week 1 boss of each month, for the weekend editor: month-01 belongs to town t01.
const weekends = readdirSync(join(CONTENT, "weekends"))
  .filter((name) => /^month-\d{2}$/.test(name) && existsSync(join(CONTENT, "weekends", name, "week-1-boss.md")))
  .sort()
  .map((name) => {
    const folder = join(CONTENT, "weekends", name);
    const answer = join(folder, "week-1-boss-model-answer.md");
    try {
      const boss = parseBoss(
        readFileSync(join(folder, "week-1-boss.md"), "utf8"),
        existsSync(answer) ? readFileSync(answer, "utf8") : undefined,
      );
      return { townId: `t${name.slice(-2)}`, boss };
    } catch (error) {
      console.error(`content: ${join(folder, "week-1-boss.md")}: ${error.message}`);
      process.exit(1);
    }
  });

if (mode === "build") {
  // Only well-formed towns can add ids. A broken town is reported by the check below.
  const parsed = towns.map((town) => townSchema.safeParse(town)).filter((r) => r.success).map((r) => r.data);
  ledger = addNewIds(ledger, contentIds(parsed));
}

const problems = checkContent({ towns, glossary, ledger });
if (problems.length > 0) {
  console.error(`content: ${problems.length} problem(s)`);
  for (const { where, message } of problems) console.error(`  ${where}: ${message}`);
  process.exit(1);
}

const toJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const bundle = toJson(buildBundle(towns.map((town) => townSchema.parse(town)), glossarySchema.parse(glossary).words, weekends));
const fixtureTowns = [fixtureTown(), fixtureTwistTown()].map((town) => townSchema.parse(town));
const fixtureBundle = toJson(
  buildBundle(fixtureTowns, glossarySchema.parse(fixtureGlossary()).words, [
    { townId: "t99", boss: parseBoss(fixtureBossMarkdown()) },
  ]),
);

if (mode === "build") {
  writeFileSync(LEDGER, `${JSON.stringify({ ids: ledger }, null, 2)}\n`);
  writeFileSync(BUNDLE, bundle);
  writeFileSync(FIXTURE_BUNDLE, fixtureBundle);
  console.log(`content: ${townFiles.length} town(s), ${ledger.length} id(s) in the ledger. Wrote ${BUNDLE}.`);
} else {
  for (const [path, expected] of [
    [BUNDLE, bundle],
    [FIXTURE_BUNDLE, fixtureBundle],
  ]) {
    let current = "";
    try {
      current = readFileSync(path, "utf8");
    } catch {}
    if (current !== expected) {
      console.error(`content: ${path} is out of date. Run \`npm run content:build\` and commit the result.`);
      process.exit(1);
    }
  }
  console.log(`content: ${townFiles.length} town(s) ok, ${ledger.length} id(s) in the ledger.`);
}
