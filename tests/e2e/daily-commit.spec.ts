import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sql } from "../support/local-admin";
import { local, signInNewUser } from "../support/e2e";

test("the commit screen has three big buttons in the lower half, and one tap starts a session", async ({ page }) => {
  const user = await signInNewUser(page, "commit");
  try {
    await expect(page.getByText("Today I commit to:")).toBeVisible();
    const viewport = page.viewportSize()!;
    for (const name of ["3 minutes", "15 minutes", "45 minutes"]) {
      const box = (await page.getByRole("button", { name }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(56);
      expect(box.y).toBeGreaterThanOrEqual(viewport.height / 2);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByRole("button", { name: "3 minutes" }).click();
    await expect(page.getByRole("heading", { name: "3-minute session" })).toBeVisible();

    // The start of the session is saved at once.
    await expect
      .poll(async () => (await sql(local, "select 1 from session_events e join auth.users u on u.id = e.user_id where u.email = $1", [user.email])).length)
      .toBeGreaterThan(0);

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("0 of 30 days")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/streak/i);
  } finally {
    await user.forget();
  }
});

test("the home screen shows the 30-day rate, counting a day with 3 minutes of learning", async ({ page }) => {
  const user = await signInNewUser(page, "rate");
  try {
    await expect(page.getByText("0 of 30 days")).toBeVisible();
    await sql(
      local,
      `insert into session_events (user_id, client_event_id, session_id, occurred_at, committed_minutes, active_seconds, device)
       select id, gen_random_uuid(), gen_random_uuid(), now(), 3, 180, 'test' from auth.users where email = $1`,
      [user.email],
    );
    await page.reload();
    await expect(page.getByText("1 of 30 days")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/streak/i);
  } finally {
    await user.forget();
  }
});

test.describe("on a phone set to Paris time", () => {
  test.use({ timezoneId: "Europe/Paris" });

  test("Settings can switch the home time zone to the phone's time zone", async ({ page }) => {
    const user = await signInNewUser(page, "tz");
    try {
      await page.getByRole("link", { name: "Settings" }).click();
      await expect(page.getByText("Home time zone: Asia/Ho_Chi_Minh")).toBeVisible();
      await expect(page.getByText(/Day 1 of your program: \d+ \w{3} \d{4}/)).toBeVisible();
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(accessibility.violations).toEqual([]);
      await page.getByRole("button", { name: "Use this phone's time zone" }).click();
      await expect(page.getByText("Home time zone: Europe/Paris")).toBeVisible();
      await page.reload();
      await expect(page.getByText("Home time zone: Europe/Paris")).toBeVisible();
    } finally {
      await user.forget();
    }
  });
});
