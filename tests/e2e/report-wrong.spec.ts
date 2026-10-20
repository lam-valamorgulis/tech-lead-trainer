import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

async function reportsOf(email: string) {
  return sql(
    local,
    `select r.item_id, r.screen, r.message, r.status from content_reports r join auth.users u on u.id = r.user_id
      where u.email = $1 order by r.id`,
    [email],
  );
}

test("one tap on Report wrong saves a report from a card, and a short note is optional", async ({ page }) => {
  const user = await signInNewUser(page, "report");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await page.getByLabel("To load it faster next time").check();
    await page.getByLabel("Sure").check();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Read the card" }).click();

    await page.getByRole("button", { name: "Report wrong" }).click();
    await expect(page.getByText("Thanks. The report is saved.")).toBeFocused();
    await expect.poll(() => reportsOf(user.email)).toEqual([
      { item_id: "cache", screen: "catch-card", message: null, status: "open" },
    ]);

    await page.getByLabel("What is wrong? (optional)").fill("The example is unclear.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Note added.")).toBeVisible();
    await expect.poll(() => reportsOf(user.email)).toEqual([
      { item_id: "cache", screen: "catch-card", message: "The example is unclear.", status: "open" },
    ]);
  } finally {
    await user.forget();
  }
});

test("a review has a Report wrong button too", async ({ page }) => {
  const user = await signInNewUser(page, "report-review");
  try {
    await sql(
      local,
      `insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now() - interval '1 day', 'cache', 'creature',
              '0123456789abcdef', 'x', true, 3, 'before-card' from auth.users where email = $1`,
      [user.email],
    );
    await page.reload();
    await page.getByRole("button", { name: "3 minutes" }).click();
    // The question itself can be wrong, so the button is there before Reveal.
    await page.getByRole("button", { name: "Report wrong" }).click();
    await expect(page.getByText("Thanks. The report is saved.")).toBeVisible();
    await expect.poll(() => reportsOf(user.email)).toEqual([
      { item_id: "cache", screen: "review", message: null, status: "open" },
    ]);
  } finally {
    await user.forget();
  }
});
