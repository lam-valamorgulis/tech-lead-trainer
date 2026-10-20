import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// The fixture pairs Cache with Cookie as easy to confuse.

async function catchOn(email: string, itemId: string, daysAgo: number) {
  await sql(
    local,
    `with u as (select id from auth.users where email = $1)
     insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                               answer_text, correct, confidence, phase)
     select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $3), $2, 'creature',
            '0123456789abcdef', 'seed', true, 3, 'before-card' from u`,
    [email, itemId, daysAgo],
  );
}

test("a confusable partner is mixed into today's reviews right after its pair, without moving its schedule", async ({ page }) => {
  const user = await signInNewUser(page, "interleave");
  try {
    // Cache is due. Cookie was caught today, so it is not due until tomorrow.
    await catchOn(user.email, "cache", 2);
    await catchOn(user.email, "cookie", 0);
    await page.getByRole("button", { name: "15 minutes" }).click();

    await expect(page.getByRole("heading", { name: "Review 1 of 2: Cache" })).toBeVisible();
    await page.getByRole("button", { name: "Reveal" }).click();
    await page.getByRole("button", { name: /^Good/ }).click();

    await expect(page.getByRole("heading", { name: "Review 2 of 2: Cookie" })).toBeVisible();
    await expect(page.getByText("Mixed in: easy to confuse with Cache.")).toBeVisible();
    await page.getByRole("button", { name: "Reveal" }).click();
    // An early Good keeps the due day: tomorrow.
    await expect(page.getByRole("button", { name: /^Good/ })).toContainText("1 day");
    await page.getByRole("button", { name: /^Good/ }).click();

    await expect
      .poll(() =>
        sql<{ step_before: number; step_after: number }>(
          local,
          `select step_before, step_after from review_events r join auth.users u on u.id = r.user_id
            where u.email = $1 and item_id = 'cookie'`,
          [user.email],
        ),
      )
      .toEqual([{ step_before: 1, step_after: 1 }]);
  } finally {
    await user.forget();
  }
});
