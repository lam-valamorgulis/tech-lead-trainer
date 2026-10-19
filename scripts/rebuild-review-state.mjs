// Recomputes the review_state cache of every user from the event log (design 12.2).
//   npm run rebuild:review-state
// Local Supabase only. The live project gets the same run after the export in the ship steps.
import { createClient } from "@supabase/supabase-js";
import { rebuildReviewState } from "../src/lib/review-state.ts";
import { readLocalSupabase } from "./local-supabase.mjs";

const local = readLocalSupabase();
const admin = createClient(local.url, local.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

let users = 0;
let rows = 0;
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    rows += await rebuildReviewState(admin, user.id);
    users += 1;
  }
  if (data.users.length < 1000) break;
}
console.log(`review_state: rebuilt ${rows} row(s) for ${users} user(s) on ${local.url}.`);
