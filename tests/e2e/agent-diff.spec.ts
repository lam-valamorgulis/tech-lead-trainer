import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { battlePanel, catchItems, nextTurn, panelSettled, playMove } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C runs on the fixture town. Its Agent Diff Battle "Cache diff" (#106): an agent added a
// one-hour cache to the price endpoint. On each turn Block is best (2), Ask for a test does 1,
// Approve does 0. Reason 0 is right, and each turn trains Skills 14 and 15.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const RIGHT = "A cached price shows shoppers the wrong amount.";
const WRONG = "Caching always makes an API safer.";
const LONG_LINE = "const price = await prices.findBySku(req.params.sku, { includeSalePrice: true, currency: req.query.currency });";

/**
 * Makes today an Agent Diff day (the week rule, battle-week.ts): the second Battle day of the week.
 * The week starts on Monday, so on a Monday no earlier day of the week exists. The learner's
 * home time zone moves to one where today is not a Monday: at any moment the two zones below
 * are 26 hours apart, so one of them is not on a Monday. Day 1 of the program moves with it.
 * Then: a normal Battle 8 days ago (the learner knows how a Battle works) and this week's
 * Meeting yesterday.
 */
async function agentDiffDay(email: string) {
  await sql(
    local,
    `update profiles p
        set home_time_zone = z.zone, program_start_date = private.learning_day(now(), z.zone, p.day_cutoff_hour)
       from (select zone from unnest(array['Pacific/Kiritimati', 'Etc/GMT+12']) as zone
              where extract(isodow from private.learning_day(now(), zone, 4::smallint)) <> 1
              limit 1) z
      where p.user_id = (select id from auth.users where email = $1)`,
    [email],
  );
  for (const [daysAgo, scenarioId, moveId, kind] of [
    [8, "t99-sale-day", "cache.ttl", "battle"],
    [1, "t99-late-launch", "answer.facts-0", "meeting"],
  ] as const) {
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
                                       turn_number, move_id, damage, best_move, battle_kind)
       select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $2), gen_random_uuid(), $3,
              '0123456789abcdef', 1, $4, 2, true, $5 from u`,
      [email, daysAgo, scenarioId, moveId, kind],
    );
  }
}

/** Design 9 rule 2: the panel takes at most half the screen and never covers the agent, You or an HP box. */
async function expectPanelBelowTheScene(page: Page) {
  await panelSettled(page);
  const height = page.viewportSize()!.height;
  const top = (await battlePanel(page).boundingBox())!.y;
  expect(top).toBeGreaterThanOrEqual(height / 2 - 1);
  for (const part of [page.getByTestId("opponent"), page.getByTestId("my-creature"), page.locator(".battle-hp-mine")]) {
    const box = (await part.boundingBox())!;
    expect(box.height).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(top);
  }
}

/**
 * The code reads without zoom: 14 px or more, no wrap, and the page never scrolls sideways. In the
 * panel (at most 460 px wide) the long line is wider than the block, so the block scrolls sideways
 * on its own. On a wide desktop start page the code fits, so it has nothing to scroll.
 */
async function expectReadableCode(page: Page, block: ReturnType<Page["getByTestId"]>, { scrolls = true } = {}) {
  const code = block.locator("pre");
  expect(await code.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await code.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre");
  expect(await code.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/monospace/);
  if (scrolls) {
    expect(await block.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await block.evaluate((el) => el.scrollTo({ left: 120 }));
    expect(await block.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await block.evaluate((el) => el.scrollTo({ left: 0 }));
  }
  // No page-wide sideways scroll, and the box around the code does not scroll sideways either.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const box = await block.evaluate((el) => el.parentElement!.getBoundingClientRect().width);
  expect((await block.boundingBox())!.width).toBeLessThanOrEqual(box);
  // Added and removed lines carry a sign, not only a colour.
  await expect(block.locator(".diff-added .diff-sign")).toHaveText("+");
  await expect(block.locator(".diff-removed .diff-sign")).toHaveText("−");
  await expect(block.locator(".diff-added")).toContainText('res.set("Cache-Control", "max-age=3600");');
  await expect(block.locator(".diff-added")).toContainText("Added:");
}

/**
 * The code block keeps the full height of its code: in the panel's flex column it must not shrink
 * (#139 review). Scrolled to, it is on screen, and it shows every line with no inner vertical scroll.
 */
async function expectWholeCode(block: ReturnType<Page["getByTestId"]>) {
  await block.scrollIntoViewIfNeeded();
  await expect(block).toBeInViewport();
  const { shown, code } = await block.evaluate((el) => ({ shown: el.clientHeight, code: el.querySelector("pre")!.scrollHeight }));
  expect(code).toBeGreaterThan(100);
  expect(shown).toBeGreaterThanOrEqual(code);
}

test("on a small iPhone the code block keeps its full height, and the panel scrolls instead", async ({ page }) => {
  test.setTimeout(60_000);
  // iPhone SE size: the panel is 333 px, shorter than the threat, the code and the verdicts together.
  await page.setViewportSize({ width: 375, height: 667 });
  const user = await signInNewUser(page, "agent-diff-small");
  try {
    await agentDiffDay(user.email);
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await page.reload();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await page.getByRole("button", { name: "Start the review" }).click();

    const panel = battlePanel(page);
    await expect(panel.getByRole("heading", { name: "Turn 1 of 3" })).toBeFocused();
    await panelSettled(page);
    expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(667 / 2 - 1);
    await expect(page.getByTestId("battle-more")).toHaveText("More verdicts below ↓");
    await expectWholeCode(panel.getByTestId("diff-block"));
    // The last verdict is still reachable at the end of the panel.
    await panel.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(panel.getByRole("button", { name: /^Ask for a test/ })).toBeInViewport({ ratio: 1 });
  } finally {
    await user.forget();
  }
});

test("an Agent Diff Battle: the agent in a lab, the code in the panel, review verdicts, Risk and Trust, kind and Skills logged", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const user = await signInNewUser(page, "agent-diff");
  try {
    await agentDiffDay(user.email);
    // Caught today, so today has no catch and no review: the Battle of the day comes first.
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await page.reload();
    await page.getByRole("button", { name: "15 minutes" }).click();

    // The review starts with the AI agent, the situation and its diff. You review alone: no team to pick.
    await expect(page.getByRole("heading", { name: "A code review begins: Cache diff" })).toBeFocused();
    await expect(page.getByText("With: AI agent")).toBeVisible();
    await expect(page.locator(".battle-intro img[src$='/monster-3-front.png']")).toBeVisible();
    await expect(page.getByText("An agent added caching to the price endpoint.")).toBeVisible();
    await expect(page.getByText("Risk 4 of 4")).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expectReadableCode(page, page.getByTestId("diff-block"), { scrolls: testInfo.project.name === "iphone" });
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Start the review" }).click();

    // A lab scene. The agent is a sprite on a pad; You are a framed portrait.
    const scene = page.getByRole("region", { name: "Agent Diff Battle: Cache diff" });
    await expect(scene).toBeInViewport({ ratio: 1 });
    await expect(scene.locator(".battle-stage-lab")).toBeVisible();
    await expect(page.getByTestId("opponent").locator("img")).toHaveAttribute("src", /\/monster-3-front\.png$/);
    await expect(page.getByTestId("my-creature").locator(".portrait-frame img")).toHaveAttribute("src", /\/portrait-3\.png$/);
    await expect(scene.getByText("AI agent")).toBeVisible();
    await expect(page.getByText("Opponent Risk 4 of 4")).toBeAttached();
    await expect(page.getByText("You Trust 3 of 3")).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.music)).toBe("battle");

    // Turn 1: what changed, the agent's code, the release Constraint, then the verdicts.
    const panel = battlePanel(page);
    await expect(panel.getByRole("heading", { name: "Turn 1 of 3" })).toBeFocused();
    await panelSettled(page);
    await expect(panel.getByText("What changed")).toBeVisible();
    await expect(panel.getByText("The price response is now cached for one hour.")).toBeVisible();
    await expect(panel.getByText("The release goes out tonight.")).toBeVisible();
    const code = panel.getByTestId("diff-block");
    await expect(code).toContainText(LONG_LINE);
    await expectReadableCode(page, code);
    await expectWholeCode(code);
    for (const verdict of ["Block (Do not merge it)", "Approve (Merge it as it is)", "Ask for a test (Merge it only after a test proves it)"]) {
      await panel.getByRole("button", { name: verdict, exact: true }).scrollIntoViewIfNeeded();
      await expect(panel.getByRole("button", { name: verdict, exact: true })).toBeVisible();
    }
    await panel.evaluate((el) => el.scrollTo({ top: 0 }));
    if (testInfo.project.name === "iphone") await expectPanelBelowTheScene(page);
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

    // Ask for a test: a small hit, and the team trusts the review less.
    await playMove(page, "Ask for a test (Merge it only after a test proves it)", RIGHT);
    await expect(panel.getByText("Hit · 1 ●○")).toBeVisible();
    await expect(panel.getByText("You chose Ask for a test. A test finds it, but the release is late.")).toBeVisible();
    await expect(panel.getByText("The team trusts your review less: −1 Trust.")).toBeVisible();
    await expect(page.getByText("You Trust 2 of 3")).toBeAttached();
    await nextTurn(page);

    // Turn 2: Block with a wrong Reason. The hit is 1 weaker, and Trust holds.
    await expect(panel.getByRole("heading", { name: "Turn 2 of 3" })).toBeFocused();
    await panelSettled(page);
    await panel.getByRole("button", { name: "Block (Do not merge it)", exact: true }).click();
    await expect(panel.getByRole("heading", { name: "Why Block?" })).toBeFocused();
    await panel.getByRole("button", { name: "Back to the moves" }).click();
    await playMove(page, "Block (Do not merge it)", WRONG);
    await expect(panel.getByText(`Wrong Reason. The right one: “${RIGHT}” Your hit lost 1.`)).toBeVisible();
    await expect(panel.getByText("Best verdict. No Trust lost.")).toBeVisible();
    await expect(page.getByText("Opponent Risk 2 of 4")).toBeAttached();
    await nextTurn(page);

    // Turn 3: Block and the right Reason. No risk is left.
    await playMove(page, "Block (Do not merge it)", RIGHT);
    await expect(panel.getByText("Strong hit · 2 ●●")).toBeVisible();
    await expect(panel.getByText("The diff has no risk left!")).toBeVisible();
    await nextTurn(page, true);
    await expect(scene).toHaveCount(0);

    // The end screen names the diff and the verdicts.
    await expect(page.getByText("The diff's Risk reached 0 in 3 turns.")).toBeVisible();
    await expect(page.getByText("verdict.", { exact: false })).toHaveCount(0);

    // Each turn row carries the kind and the Skills, fixed at play time.
    await expect
      .poll(() =>
        sql(
          local,
          `select turn_number, move_id, damage, best_move, battle_kind, move_damage, reason_index, reason_correct, hp_lost,
                  skill_ids, constraint_variant
             from battle_turn_events t join auth.users u on u.id = t.user_id
            where u.email = $1 and scenario_id = 't99-cache-diff' order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { turn_number: 1, move_id: "verdict.ask-for-test", damage: 1, best_move: false, battle_kind: "agent-diff", move_damage: 1, reason_index: 0, reason_correct: true, hp_lost: 1, skill_ids: [14, 15], constraint_variant: "main" },
        { turn_number: 2, move_id: "verdict.block", damage: 1, best_move: true, battle_kind: "agent-diff", move_damage: 2, reason_index: 1, reason_correct: false, hp_lost: 0, skill_ids: [14, 15], constraint_variant: "main" },
        { turn_number: 3, move_id: "verdict.block", damage: 2, best_move: true, battle_kind: "agent-diff", move_damage: 2, reason_index: 0, reason_correct: true, hp_lost: 0, skill_ids: [14, 15], constraint_variant: "main" },
      ]);
    await expect
      .poll(() =>
        sql(
          local,
          `select result, turns_used, battle_kind, faints, team from battle_events b join auth.users u on u.id = b.user_id
            where u.email = $1 and scenario_id = 't99-cache-diff'`,
          [user.email],
        ),
      )
      .toEqual([{ result: "won", turns_used: 3, battle_kind: "agent-diff", faints: 0, team: ["you"] }]);
  } finally {
    await user.forget();
  }
});
