import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

test("the Field Guide shows stage 2 after Cache passes its 7-day step", async ({ page }) => {
  const user = await signInNewUser(page, "evolve");
  try {
    // Caught 20 days ago, then Good on time three times: 1 → 3 → 7 → 14.
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now() - interval '20 days', 'cache', 'creature',
              '0123456789abcdef', 'To load it faster next time', true, 3, 'before-card' from u`,
      [user.email],
    );
    for (const [daysAgo, before, after] of [
      [19, 1, 3],
      [16, 3, 7],
      [9, 7, 14],
    ]) {
      await sql(
        local,
        `with u as (select id from auth.users where email = $1)
         insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                    step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at)
         select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $2), 'cache', 'creature',
                '0123456789abcdef', $3, $4, 'good', (now() - make_interval(days => $2))::date,
                now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2)
           from u`,
        [user.email, daysAgo, before, after],
      );
    }

    await page.getByRole("link", { name: "Field Guide" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Cache" })).toContainText("Caught · stage 2");
  } finally {
    await user.forget();
  }
});
