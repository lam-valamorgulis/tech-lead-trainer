import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addDays } from "../../src/core/day";
import { formatWeek, latestSummaryWeek } from "../../src/core/week";
import { sql } from "../support/local-admin";
import { BLAME, local, signInNewUser } from "../support/e2e";

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

/** A battle turn that showed its Constraint (v2, #102). */
async function playedTurn(email: string, scenarioId: string, turnNumber: number, bestMove: boolean, occurredAt: string) {
  await sql(
    local,
    `insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
       turn_number, move_id, damage, best_move, battle_kind, move_damage, reason_index, reason_correct, hp_lost, constraint_variant)
     select id, gen_random_uuid(), gen_random_uuid(), $2::timestamptz, gen_random_uuid(), $3, '0123456789abcdef',
       $4, 'cache.ttl', 2, $5, 'battle', 2, 0, true, 0, 'main'
     from auth.users where email = $1`,
    [email, occurredAt, scenarioId, turnNumber, bestMove],
  );
}

/** An answered Decision Card (#109): right means the right option and the right Reason. */
async function answeredCard(email: string, cardId: string, right: boolean, occurredAt: string) {
  await sql(
    local,
    `insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
       choice_index, choice_correct, reason_index, reason_correct, skill_ids, shown_at, graded_at, rules_version)
     select id, gen_random_uuid(), gen_random_uuid(), $3::timestamptz, $2, 'decision', '0123456789abcdef',
       0, $4, 0, true, '{1}', $3::timestamptz, $3::timestamptz, 'v1.5'
     from auth.users where email = $1`,
    [email, cardId, occurredAt, right],
  );
}

/**
 * A week of v1.5 learning in the last summary week, and one turn in the week before. In the fixture
 * town, turn 1 of t99-sale-day tests Cache and turn 3 tests Proxy (their best moves).
 */
async function learnAWeekOfPicks(email: string) {
  const { weekStart } = latestSummaryWeek(new Date(), "Asia/Ho_Chi_Minh");
  // 09:00 home time (UTC+7) on Monday and Tuesday, and on the Wednesday of the week before.
  const monday = `${weekStart}T02:00:00Z`;
  const tuesday = `${addDays(weekStart, 1)}T02:00:00Z`;
  await playedTurn(email, "t99-sale-day", 1, true, `${addDays(weekStart, -5)}T02:00:00Z`);
  await playedTurn(email, "t99-sale-day", 1, true, monday);
  await playedTurn(email, "t99-sale-day", 3, false, monday);
  await answeredCard(email, "proxy.decision.edge", false, tuesday);
  await answeredCard(email, "cache.decision.ttl", true, tuesday);
  // The session goes in last: home may save the summary as soon as the week has a session.
  await learned(email, `'${monday}'::timestamptz`, 1200);
  return weekStart;
}

/** The answers in the work question log of one learner. */
function workAnswers(email: string) {
  return sql<{ week_start: string; concept_id: string; met: boolean; note: string | null }>(
    local,
    `select week_start::text, concept_id, met, note from work_question_events
     where user_id = (select id from auth.users where email = $1) order by id`,
    [email],
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
    await expect(page.getByText("Best moves under Constraint: no turns this week")).toBeVisible();
    await expect(page.getByText("Decision Cards right: no cards this week")).toBeVisible();
    await expect(page.getByText("Concepts to work on: none this week")).toBeVisible();
    await expect(page.getByText("Weakest creatures: Cache")).toBeVisible();
    // No wrong pick this week, so the question names the weakest creature.
    await expect(page.getByText("Where did you meet Cache at work this week?")).toBeVisible();
    // The summary sits on the Rest Stop here, which never blames the learner (design 5).
    await expect(page.locator(".week-summary")).not.toContainText(BLAME);
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

test("the Sunday summary compares with last week, names the concepts to work on and saves a short answer", async ({ page }) => {
  const user = await signInNewUser(page, "week-picks");
  try {
    const weekStart = await learnAWeekOfPicks(user.email);
    await page.reload();
    await page.getByText(`Week summary: ${formatWeek(weekStart)}`).click();
    await expect(page.getByText("Best moves under Constraint: 50% (1 of 2 turns), down 50 points from 100% last week")).toBeVisible();
    await expect(page.getByText("Decision Cards right: 50% (1 of 2 cards), none last week")).toBeVisible();
    // Proxy: 1 turn without the best move and 1 wrong Decision Card.
    await expect(page.getByText("Concepts to work on: Proxy")).toBeVisible();
    await expect(page.getByText("Where did you meet Proxy at work this week?")).toBeVisible();
    await expect(page.locator(".week-summary")).not.toContainText(BLAME);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByLabel("Where? 1 or 2 sentences (optional)").fill("Our CDN served an old page after a deploy.");
    await page.getByRole("button", { name: "I met it" }).click();
    await expect(page.locator(".week-summary").getByRole("status")).toHaveText("Your answer: Our CDN served an old page after a deploy.");
    await expect.poll(() => workAnswers(user.email)).toEqual([
      { week_start: weekStart, concept_id: "proxy", met: true, note: "Our CDN served an old page after a deploy." },
    ]);

    // The answer and the numbers are still there after a reload.
    await page.reload();
    await page.getByText(`Week summary: ${formatWeek(weekStart)}`).click();
    await expect(page.getByText("Concepts to work on: Proxy")).toBeVisible();
    await expect(page.locator(".week-summary").getByRole("status")).toHaveText("Your answer: Our CDN served an old page after a deploy.");
    await expect(page.getByRole("button", { name: "Not this week" })).toBeHidden();
  } finally {
    await user.forget();
  }
});

test("'Not this week' is one tap, and is saved", async ({ page }) => {
  const user = await signInNewUser(page, "week-not-this-week");
  try {
    const weekStart = await learnAWeekOfPicks(user.email);
    await page.reload();
    await page.getByText(`Week summary: ${formatWeek(weekStart)}`).click();
    await page.getByRole("button", { name: "Not this week" }).click();
    await expect(page.locator(".week-summary").getByRole("status")).toHaveText("Your answer: Not this week.");
    await expect.poll(() => workAnswers(user.email)).toEqual([{ week_start: weekStart, concept_id: "proxy", met: false, note: null }]);
    await page.reload();
    await page.getByText(`Week summary: ${formatWeek(weekStart)}`).click();
    await expect(page.locator(".week-summary").getByRole("status")).toHaveText("Your answer: Not this week.");
  } finally {
    await user.forget();
  }
});

test("a summary saved before v1.5 keeps its old lines and asks no question", async ({ page }) => {
  const user = await signInNewUser(page, "week-old-summary");
  try {
    const { weekStart, summaryAt } = latestSummaryWeek(new Date(), "Asia/Ho_Chi_Minh");
    await sql(
      local,
      `insert into weekly_summaries (user_id, week_start, summary_at, days_learned, minutes, goal_minutes, best_moves, best_move_turns, weakest_creatures)
       select id, $2, $3, 2, 40, 315, 1, 2, '[{"id": "cache", "name": "Cache"}]' from auth.users where email = $1`,
      [user.email, weekStart, summaryAt.toISOString()],
    );
    await page.reload();
    await page.getByText(`Week summary: ${formatWeek(weekStart)}`).click();
    await expect(page.getByText("Days learned: 2 of 7")).toBeVisible();
    await expect(page.getByText("Best moves: 50% (1 of 2 turns)")).toBeVisible();
    await expect(page.getByText("Weakest creatures: Cache")).toBeVisible();
    await expect(page.getByText("Best moves under Constraint")).toBeHidden();
    await expect(page.getByText(/at work this week/)).toBeHidden();
  } finally {
    await user.forget();
  }
});
