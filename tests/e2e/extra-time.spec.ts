import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C uses the fixture town: 5 copies of "Sale day". Every card cites MDN: HTTP caching.

/** Cache, Cookie and Proxy caught today, and today's normal battle already played: a 45-minute day goes to extra time. */
async function setUpExtraTime(email: string) {
  for (const itemId of ["cache", "cookie", "proxy"]) {
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now(), $2, 'creature', '0123456789abcdef', 'seed', true, 3,
              'before-card' from u`,
      [email, itemId],
    );
  }
  await sql(
    local,
    `with u as (select id from auth.users where email = $1)
     insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
                                     turn_number, move_id, damage, best_move, why_text)
     select id, gen_random_uuid(), gen_random_uuid(), now(), gen_random_uuid(), 't99-sale-day', '0123456789abcdef',
            1, 'cache.ttl', 2, true, 'seed' from u`,
    [email],
  );
}

test("a 45-minute day adds extra time; read-close-write hides the source while the learner writes 3 points", async ({ page }) => {
  const user = await signInNewUser(page, "extra-time");
  try {
    await setUpExtraTime(user.email);
    await page.reload();
    await page.getByRole("button", { name: "45 minutes" }).click();

    await expect(page.getByRole("heading", { name: "Extra time" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Extra battle" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Work on the boss" })).toHaveAttribute("href", "/weekend/t99");

    await page.getByRole("button", { name: "Read, close, write" }).click();
    const source = page.getByRole("link", { name: /MDN: HTTP caching/ });
    await expect(source).toHaveAttribute("href", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching");
    await page.getByRole("button", { name: "I have read it: close the source" }).click();

    // The source is gone while the learner writes from memory.
    await expect(source).toHaveCount(0);
    await expect(page.getByText(/developer\.mozilla\.org/)).toHaveCount(0);
    const save = page.getByRole("button", { name: "Save my 3 points" });
    await page.getByLabel("Point 1").fill("A cache keeps a copy of a response.");
    await page.getByLabel("Point 2").fill("max-age says how long the copy is fresh.");
    await expect(save).toBeDisabled();
    await page.getByLabel("Point 3").fill("no-store keeps no copy at all.");
    await save.click();
    await expect(page.getByText("Saved. Now open the source again and compare.")).toBeVisible();

    await expect
      .poll(() =>
        sql<{ item_id: string; points: string[] }>(
          local,
          `select item_id, points from reading_events r join auth.users u on u.id = r.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([
        {
          item_id: "cache",
          points: ["A cache keeps a copy of a response.", "max-age says how long the copy is fresh.", "no-store keeps no copy at all."],
        },
      ]);
  } finally {
    await user.forget();
  }
});

test("leaving for the boss keeps the seconds learned in the session", async ({ page }) => {
  const user = await signInNewUser(page, "extra-time-boss");
  try {
    await setUpExtraTime(user.email);
    await page.reload();
    await page.getByRole("button", { name: "45 minutes" }).click();
    await expect(page.getByRole("heading", { name: "Extra time" })).toBeVisible();
    // The timer saves every 60 seconds. Leave after 3, before any timed save.
    await expect(page.getByText("Active time: 0:03")).toBeVisible();
    await page.getByRole("link", { name: "Work on the boss" }).click();
    await expect(page).toHaveURL(/\/weekend\/t99$/);

    await expect
      .poll(async () => {
        const [row] = await sql<{ seconds: number }>(
          local,
          `select coalesce(max(active_seconds), 0) as seconds from session_events s join auth.users u on u.id = s.user_id
            where u.email = $1 and committed_minutes = 45`,
          [user.email],
        );
        return row.seconds;
      })
      .toBeGreaterThanOrEqual(2);
  } finally {
    await user.forget();
  }
});

test("a 15-minute day has no extra time", async ({ page }) => {
  const user = await signInNewUser(page, "extra-time-15");
  try {
    await setUpExtraTime(user.email);
    await page.reload();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Extra time" })).toHaveCount(0);
  } finally {
    await user.forget();
  }
});
