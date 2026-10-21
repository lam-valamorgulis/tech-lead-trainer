import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// #109, design 6.4 and 6.5: a Decision Card in review, and the Stage 3 trade-off question.
// The fixture's Cache has the Decision Card cache.decision.logo and the trade-off question
// cache.trade-off.fresh-prices.

/** Logs the pitch of every note that starts. The "right" sound starts with a 659 Hz then a 988 Hz note. */
async function listenForNotes(page: Page) {
  await page.addInitScript(() => {
    const started: number[] = [];
    (window as unknown as { startedNotes: number[] }).startedNotes = started;
    const Real = window.AudioContext;
    if (!Real) return;
    window.AudioContext = class extends Real {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          started.push(oscillator.frequency.value);
          start(when);
        };
        return oscillator;
      }
    };
  });
}

/** The music uses exact note pitches (988 is 987.77 Hz there), so a whole 988 is the "right" sound. */
const playedRightSound = (page: Page) =>
  page.evaluate(() => (window as unknown as { startedNotes: number[] }).startedNotes.includes(988));

async function catchYesterday(email: string, itemId: string, kind: "creature" | "move") {
  await sql(
    local,
    `with u as (select id from auth.users where email = $1)
     insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                               answer_text, correct, confidence, phase)
     select id, gen_random_uuid(), gen_random_uuid(), now() - interval '1 day', $2, $3,
            '0123456789abcdef', 'seed', true, 3, 'before-card' from u`,
    [email, itemId, kind],
  );
}

/** Thinks, taps Reveal and grades Good. */
async function reviewGood(page: Page, heading: string) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await page.getByRole("button", { name: "Reveal" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
}

const cardRows = (email: string) =>
  sql(
    local,
    `select r.item_id, r.item_kind, r.choice_index, r.choice_correct, r.reason_index, r.reason_correct, r.skill_ids,
            r.grade, r.rules_version
       from review_events r join auth.users u on u.id = r.user_id
      where u.email = $1 and r.item_kind in ('decision', 'trade-off')`,
    [email],
  );

test("with 4 due reviews, the 4th place is a Decision Card with the creature, graded at once with a sound", async ({ page }) => {
  await listenForNotes(page);
  const user = await signInNewUser(page, "decision-card");
  try {
    await catchYesterday(user.email, "cache", "creature");
    await catchYesterday(user.email, "cache.ttl", "move");
    await catchYesterday(user.email, "cookie", "creature");
    await catchYesterday(user.email, "proxy", "creature");
    await page.reload();
    await page.getByRole("button", { name: "3 minutes" }).click();

    // Cookie is Cache's confusable partner, so it comes right after Cache.
    await reviewGood(page, "Review 1 of 5: Cache");
    await reviewGood(page, "Review 2 of 5: Cookie");
    await reviewGood(page, "Review 3 of 5: TTL");

    await expect(page.getByRole("heading", { name: "Review 4 of 5: Decision Card" })).toBeVisible();
    const card = page.getByRole("region", { name: "Review 4 of 5: Decision Card" });
    // The creature sprite and its name, then the situation.
    await expect(card.locator("img.creature-art")).toBeVisible();
    await expect(card.getByText("Cache", { exact: true })).toBeVisible();
    await expect(card.getByText("The shop logo changes once a year.")).toBeVisible();
    // The Reasons come after an option is picked.
    await expect(card.getByRole("button", { name: "A file that rarely changes can be kept for long." })).toHaveCount(0);
    await card.getByRole("button", { name: "Give it a long TTL" }).click();
    await expect(card.getByRole("button", { name: "Give it a long TTL" })).toHaveAttribute("aria-pressed", "true");
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    expect(await playedRightSound(page)).toBe(false);
    await card.getByRole("button", { name: "A file that rarely changes can be kept for long." }).click();
    // The result shows at once, with words and a sound.
    await expect(card.getByRole("heading", { name: "Right!" })).toBeVisible();
    await expect.poll(() => playedRightSound(page)).toBe(true);
    await expect(card.getByRole("list", { name: "Options" })).toContainText("Give it a long TTL✓ Your pick, right");
    await expect(card.getByText("A long TTL saves a download on every visit.")).toBeVisible();
    await expect(card.getByText("Good call. Cache keeps its review day.")).toBeVisible();
    await card.getByRole("button", { name: "Continue" }).click();

    await reviewGood(page, "Review 5 of 5: Proxy");
    await expect(page.getByText("All done for today.")).toBeVisible();

    await expect
      .poll(() => cardRows(user.email))
      .toEqual([
        {
          item_id: "cache.decision.logo",
          item_kind: "decision",
          choice_index: 0,
          choice_correct: true,
          reason_index: 0,
          reason_correct: true,
          skill_ids: [3],
          grade: null,
          rules_version: "v1.5",
        },
      ]);
  } finally {
    await user.forget();
  }
});

test("Good at the 30-day step asks the trade-off question, and a right answer evolves Cache to Stage 3", async ({ page }) => {
  const user = await signInNewUser(page, "trade-off");
  try {
    // Cache: caught 60 days ago, then Good on time under the v1.5 rules: 1 → 3 → 7 → 14 → 30, due 5 days ago.
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now() - interval '60 days', 'cache', 'creature',
              '0123456789abcdef', 'seed', true, 3, 'before-card' from u`,
      [user.email],
    );
    for (const [daysAgo, before, after] of [
      [59, 1, 3],
      [56, 3, 7],
      [49, 7, 14],
      [35, 14, 30],
    ]) {
      await sql(
        local,
        `with u as (select id from auth.users where email = $1)
         insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                    step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at,
                                    rules_version)
         select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $2), 'cache', 'creature',
                '0123456789abcdef', $3, $4, 'good', (now() - make_interval(days => $2))::date,
                now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2),
                'v1.5'
           from u`,
        [user.email, daysAgo, before, after],
      );
    }
    await page.reload();
    await page.getByRole("button", { name: "3 minutes" }).click();

    await expect(page.getByRole("heading", { name: "Review 1 of 1: Cache" })).toBeVisible();
    await page.getByRole("button", { name: "Reveal" }).click();
    await page.getByRole("button", { name: "Good · 90 days" }).click();

    const question = page.getByRole("region", { name: "Stage 3 question: Cache" });
    await expect(question).toBeVisible();
    await expect(question.getByText("Prices change every minute. The product page is slow.")).toBeVisible();
    // 3 options.
    await expect(question.getByRole("group", { name: "Pick one option." }).getByRole("button")).toHaveCount(3);
    await question.getByRole("button", { name: "Cache the page but not the price" }).click();
    await question.getByRole("button", { name: "The page is fast and the price stays fresh." }).click();
    await expect(question.getByRole("heading", { name: "Right!" })).toBeVisible();
    await expect(question.getByText("Cache is ready to evolve.")).toBeVisible();
    await question.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Cache evolved!" })).toBeVisible();
    await expect(page.getByText("Stage 3 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();

    await expect
      .poll(() => cardRows(user.email))
      .toEqual([
        {
          item_id: "cache.trade-off.fresh-prices",
          item_kind: "trade-off",
          choice_index: 1,
          choice_correct: true,
          reason_index: 0,
          reason_correct: true,
          skill_ids: [3],
          grade: null,
          rules_version: "v1.5",
        },
      ]);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Back home" }).click();
    await page.getByRole("link", { name: "Field Guide" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Cache" })).toContainText("Caught · stage 3");
  } finally {
    await user.forget();
  }
});
