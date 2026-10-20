import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { formatWeek, latestSummaryWeek } from "../../src/core/week";
import { sql } from "../support/local-admin";
import { local, signInNewUser } from "../support/e2e";

/** One session of `seconds` active seconds at `occurredAt` (an SQL time expression). */
async function learned(email: string, occurredAt: string, seconds: number) {
  await sql(
    local,
    `insert into session_events (user_id, client_event_id, session_id, occurred_at, committed_minutes, active_seconds, device)
     select id, gen_random_uuid(), gen_random_uuid(), ${occurredAt}, 15, $2, 'test'
     from auth.users where email = $1`,
    [email, seconds],
  );
}

async function reviewed(email: string, itemId: string, grade: string, occurredAt: string) {
  await sql(
    local,
    `insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
       step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at)
     select id, gen_random_uuid(), gen_random_uuid(), $3::timestamptz, $2, 'move', '0123456789abcdef',
       1, 1, $4, $3::date, $3::timestamptz, $3::timestamptz, $3::timestamptz
     from auth.users where email = $1`,
    [email, itemId, occurredAt, grade],
  );
}

test("home shows minutes this week against 5 hours 15 minutes", async ({ page }) => {
  const user = await signInNewUser(page, "week-minutes");
  try {
    await expect(page.getByText("This week: 0 min of 5 h 15 min")).toBeVisible();
    await expect(page.getByText("Week summary")).toBeHidden();

    await learned(user.email, "now()", 659);
    await page.reload();
    await expect(page.getByText("This week: 10 min of 5 h 15 min")).toBeVisible();
    // The commit buttons stay in the lower half of the screen (UI rule 5).
    const button = (await page.getByRole("button", { name: "3 minutes" }).boundingBox())!;
    expect(button.y).toBeGreaterThanOrEqual(page.viewportSize()!.height / 2);
  } finally {
    await user.forget();
  }
});

test("the Sunday summary of last week shows on home and keeps its numbers", async ({ page }) => {
  const user = await signInNewUser(page, "week-summary");
  try {
    // Monday 09:00 home time (Ho Chi Minh City, UTC+7) of the last week whose Sunday 20:00 has passed.
    const { weekStart } = latestSummaryWeek(new Date(), "Asia/Ho_Chi_Minh");
    const monday = `${weekStart}T02:00:00Z`;
    // The review goes in first: home may save the summary as soon as the week has a session.
    await reviewed(user.email, "cache.ttl", "again", monday);
    await learned(user.email, `'${monday}'::timestamptz`, 1200);
    await page.reload();

    const summary = page.getByText(`Week summary: ${formatWeek(weekStart)}`);
    await expect(summary).toBeVisible();
    // That Monday is always 6 or more days ago, so home opens on the Rest Stop. The summary sits
    // below its button, so the button stays on screen (UI rule 5).
    const viewport = page.viewportSize()!;
    const start = (await page.getByRole("button", { name: "Start 3 minutes" }).boundingBox())!;
    expect(start.y + start.height).toBeLessThanOrEqual(viewport.height);
    await summary.click();
    await expect(page.getByText("Days learned: 1 of 7")).toBeVisible();
    await expect(page.getByText("Time: 20 min of 5 h 15 min")).toBeVisible();
    await expect(page.getByText("Best moves: no battle turns yet")).toBeVisible();
    await expect(page.getByText("Weakest creatures: Cache")).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    // Learning from that week that arrives late does not change the saved summary.
    await learned(user.email, `'${monday}'::timestamptz + interval '1 day'`, 3000);
    await page.reload();
    await page.getByText(`Week summary: ${formatWeek(weekStart)}`).click();
    await expect(page.getByText("Days learned: 1 of 7")).toBeVisible();
    await expect(page.getByText("Time: 20 min of 5 h 15 min")).toBeVisible();
  } finally {
    await user.forget();
  }
});
