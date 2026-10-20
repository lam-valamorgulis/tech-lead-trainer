// The monthly content review (ticket #29): prints every open "Report wrong" as Markdown,
// grouped by item, and marks reports done after their content is fixed.
//   npm run reports                      local Supabase
//   npm run reports -- --live            the live project (reads .env.wizard and the Supabase CLI login)
//   npm run reports -- --live --done 3 5  marks reports 3 and 5 done
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { formatOpenReports, loadOpenReports, markReportsDone } from "../src/lib/report-review.ts";
import { liveSecretKey, readLiveEnv } from "./live-supabase.mjs";
import { readLocalSupabase } from "./local-supabase.mjs";

const { values: args, positionals } = parseArgs({
  options: { live: { type: "boolean", default: false }, done: { type: "boolean", default: false } },
  allowPositionals: true,
});

const target = args.live ? liveTarget() : readLocalSupabase();
const admin = createClient(target.url, target.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const command = args.live ? "npm run reports -- --live" : "npm run reports --";

if (args.done) {
  const ids = positionals.map(Number);
  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    console.error(`Give the report numbers to mark done, for example: ${command} --done 3 5`);
    process.exit(2);
  }
  const changed = await markReportsDone(admin, ids);
  console.log(`Marked ${changed} of ${ids.length} report(s) done.`);
  if (changed < ids.length) console.log("The others were already done, or do not exist.");
} else {
  console.log(formatOpenReports(await loadOpenReports(admin), contentLookup(), command));
}

function liveTarget() {
  const env = readLiveEnv();
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, secretKey: liveSecretKey(env) };
}

/** The name and current hash of every creature, move and scenario in the shipped content. */
function contentLookup() {
  const bundle = JSON.parse(readFileSync("src/content/bundle.generated.json", "utf8"));
  const lookup = new Map();
  for (const town of bundle.towns) {
    for (const creature of town.creatures) {
      lookup.set(creature.id, { name: creature.name, hash: creature.hash });
      for (const move of creature.moves) lookup.set(move.id, { name: move.name, hash: move.hash });
    }
    for (const scenario of town.scenarios) lookup.set(scenario.id, { name: scenario.name, hash: scenario.hash });
  }
  return lookup;
}
