// Recomputes the review_state cache of every user from the event log (design 12.2).
//   npm run rebuild:review-state
// Local Supabase only for now: it refuses any database that is not on this Mac.
import { createClient } from "@supabase/supabase-js";
import { rebuildReviewState } from "../src/lib/review-state.ts";
import { readLocalSupabase } from "./local-supabase.mjs";

const local = readLocalSupabase();
const admin = createClient(local.url, local.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

let users = 0;
let rows = 0;
let gone = 0;
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    try {
      rows += await rebuildReviewState(admin, user.id);
      users += 1;
    } catch (error) {
      // 23503: the user was deleted while the script ran. Their cache went with them.
      if (error?.code !== "23503") throw error;
      gone += 1;
    }
  }
  if (data.users.length < 1000) break;
}
console.log(
  `review_state: rebuilt ${rows} row(s) for ${users} user(s) on ${local.url}.` +
    (gone > 0 ? ` Skipped ${gone} user(s) deleted during the run.` : ""),
);
