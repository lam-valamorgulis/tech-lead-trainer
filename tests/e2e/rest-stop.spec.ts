import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { sql } from "../support/local-admin";
import { BLAME, local, signInNewUser } from "../support/e2e";

async function learnedDaysAgo(email: string, days: number) {
  await sql(
    local,
    `insert into session_events (user_id, client_event_id, session_id, occurred_at, committed_minutes, active_seconds, device)
     select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $2), 3, 200, 'test'
     from auth.users where email = $1`,
    [email, days],
  );
}

async function expectRestStop(page: Page) {
  await expect(page.getByRole("heading", { name: "Rest Stop" })).toBeVisible();
  await expect(page.getByText("New week starts Monday")).toBeVisible();
}

test("after 4 days away, home opens on the Rest Stop and one tap starts a 3-minute session", async ({ page }) => {
  const user = await signInNewUser(page, "rest-stop");
  try {
    await learnedDaysAgo(user.email, 4);
    await page.reload();
    await expectRestStop(page);
    await expect(page.getByText("Today I commit to:")).toBeHidden();
    await expect(page.locator("body")).not.toContainText(BLAME);

    const start = page.getByRole("button", { name: "Start 3 minutes" });
    const box = (await start.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(56);
    expect(box.y).toBeGreaterThanOrEqual(page.viewportSize()!.height / 2);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await start.click();
    await expect(page.getByRole("heading", { name: "3-minute session" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("the Rest Stop can show the usual 3 / 15 / 45 choices", async ({ page }) => {
  const user = await signInNewUser(page, "rest-stop-choices");
  try {
    await learnedDaysAgo(user.email, 5);
    await page.reload();
    await expectRestStop(page);
    await page.getByRole("button", { name: "Show all choices" }).click();
    await expect(page.getByText("Today I commit to:")).toBeVisible();
    await expect(page.getByRole("button", { name: "15 minutes" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("home does not open on the Rest Stop for a new learner or after a recent learned day", async ({ page }) => {
  const user = await signInNewUser(page, "rest-stop-none");
  try {
    // A new learner with no learning yet.
    await expect(page.getByText("0 of 30 days")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rest Stop" })).toBeHidden();

    // The last learned day was 2 days ago.
    await learnedDaysAgo(user.email, 2);
    await page.reload();
    await expect(page.getByText("1 of 30 days")).toBeVisible();
    await expect(page.getByText("Today I commit to:")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rest Stop" })).toBeHidden();
  } finally {
    await user.forget();
  }
});
