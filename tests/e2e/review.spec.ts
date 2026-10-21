import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

/** Cache was caught yesterday, so its first review (the 1-day step) is due today. */
async function caughtYesterday(email: string) {
  await sql(
    local,
    `insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                               answer_text, correct, confidence, phase)
     select id, gen_random_uuid(), gen_random_uuid(), now() - interval '1 day', 'cache', 'creature',
            '0123456789abcdef', 'To load it faster next time', true, 3, 'before-card'
       from auth.users where email = $1`,
    [email],
  );
}

test("a due review: think, Reveal, then grade Good moves it to the 3-day step", async ({ page }) => {
  const user = await signInNewUser(page, "review");
  try {
    await caughtYesterday(user.email);
    await page.reload();
    await page.getByRole("button", { name: "3 minutes" }).click();

    await expect(page.getByRole("heading", { name: "Review 1 of 1: Cache" })).toBeVisible();
    await expect(page.getByText("What does a cache keep?")).toBeVisible();
    await expect(page.getByText("Think of the answer first.")).toBeVisible();
    // A 3-minute day has no typing box.
    await expect(page.getByLabel("Your answer (optional)")).toHaveCount(0);
    // The answer stays hidden until Reveal.
    await expect(page.getByText("A copy of a response, so the next request can skip the download.")).toBeHidden();

    await page.getByRole("button", { name: "Reveal" }).click();
    await expect(page.getByText("A copy of a response, so the next request can skip the download.")).toBeVisible();
    // A glossary word in the answer can be tapped.
    await expect(page.getByRole("button", { name: "response", exact: true })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByRole("button", { name: "Good · 3 days" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();

    await expect
      .poll(async () =>
        sql(
          local,
          `select r.step_before, r.step_after, r.grade from review_events r join auth.users u on u.id = r.user_id
            where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ step_before: 1, step_after: 3, grade: "good" }]);
  } finally {
    await user.forget();
  }
});

test("on a 15-minute day the learner may type an answer, and the catch comes after the reviews", async ({ page }) => {
  const user = await signInNewUser(page, "review-15");
  try {
    await caughtYesterday(user.email);
    await page.reload();
    await page.getByRole("button", { name: "15 minutes" }).click();

    await page.getByLabel("Your answer (optional)").fill("A saved copy");
    await page.getByRole("button", { name: "Reveal" }).click();
    await page.getByRole("button", { name: "Again · 1 day" }).click();

    // Cache is caught, so the next catch is its move TTL.
    await expect(page.getByRole("heading", { name: "A new move: TTL" })).toBeVisible();

    await expect
      .poll(async () =>
        sql(
          local,
          `select r.typed_answer, r.grade from review_events r join auth.users u on u.id = r.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ typed_answer: "A saved copy", grade: "again" }]);
  } finally {
    await user.forget();
  }
});
