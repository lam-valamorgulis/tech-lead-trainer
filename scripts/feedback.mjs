// The weekly feedback read (ticket #95, design 16): prints every open Feedback note as Markdown,
// grouped by screen, and marks notes done after triage. docs/agents/feedback-triage.md says how
// the weekly agent run turns the list into needs-triage issues.
//   npm run feedback                      local Supabase
//   npm run feedback -- --live            the live project (reads .env.wizard and the Supabase CLI login)
//   npm run feedback -- --live --done 3 5  marks notes 3 and 5 done
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { formatOpenFeedback } from "../src/core/feedback.ts";
import { loadOpenFeedback, markFeedbackDone } from "../src/lib/feedback.ts";
import { liveSecretKey, readLiveEnv } from "./live-supabase.mjs";
import { readLocalSupabase } from "./local-supabase.mjs";

const { values: args, positionals } = parseArgs({
  options: { live: { type: "boolean", default: false }, done: { type: "boolean", default: false } },
  allowPositionals: true,
});

const target = args.live ? liveTarget() : readLocalSupabase();
const admin = createClient(target.url, target.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const command = args.live ? "npm run feedback -- --live" : "npm run feedback --";

if (args.done) {
  const ids = [...new Set(positionals.map(Number))];
  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    console.error(`Give the note numbers to mark done, for example: ${command} --done 3 5`);
    process.exit(2);
  }
  const changed = await markFeedbackDone(admin, ids);
  console.log(`Marked ${changed} of ${ids.length} note(s) done.`);
  if (changed < ids.length) console.log("The others were already done, or do not exist.");
} else {
  console.log(formatOpenFeedback(await loadOpenFeedback(admin), command));
}

function liveTarget() {
  const env = readLiveEnv();
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, secretKey: liveSecretKey(env) };
}
