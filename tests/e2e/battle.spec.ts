import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { battlePanel, catchItems, nextTurn, panelSettled, pickReason, playMove, SALE_DAY_REASONS } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C runs on the fixture town. Its scenario "Sale day" has a Constraint and 3 Reasons on each
// turn. The best moves are TTL, then No store, then CDN (see SALE_DAY_REASONS).

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Commits 15 minutes, reads the 2 worked examples and starts "Sale day" with Cache, Cookie and Proxy. */
async function startSaleDay(page: Page) {
  await page.getByRole("button", { name: "15 minutes" }).click();
  await page.getByRole("button", { name: "Next example" }).click();
  await page.getByRole("button", { name: "Go to the battle" }).click();
  for (const creature of ["Cache", "Cookie", "Proxy"]) await page.getByLabel(creature).check();
  await page.getByRole("button", { name: "Start the battle" }).click();
}

/** Design 9 rule 2: the panel takes at most half the screen and never covers a creature or an HP box. */
async function expectPanelBelowTheCreatures(page: Page) {
  const panel = battlePanel(page);
  await panelSettled(page);
  const height = page.viewportSize()!.height;
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(height / 2 - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  const top = box.y;
  for (const part of [page.getByTestId("opponent"), page.getByTestId("my-creature"), page.locator(".battle-hp-mine")]) {
    const box = (await part.boundingBox())!;
    expect(box.height).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(top);
  }
}

test("a full Battle on the scene: Constraint before the moves, Reasons, HP on both sides, a Faint and the next creature", async ({ page }, testInfo) => {
  // Three turns with every effect, the end screen and the database checks: a long test.
  test.setTimeout(60_000);
  const isPhone = testInfo.project.name === "iphone";
  const user = await signInNewUser(page, "battle-v2");
  try {
    // Caught today, so today has no catch and no review: the battle comes first.
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await page.getByRole("button", { name: "15 minutes" }).click();

    // The first battle with Cache and Proxy starts with their worked examples, one at a time.
    await expect(page.getByRole("heading", { name: "Worked example: Cache" })).toBeFocused();
    await page.getByRole("button", { name: "Next example" }).click();
    await expect(page.getByRole("heading", { name: "Worked example: Proxy" })).toBeFocused();
    await page.getByRole("button", { name: "Go to the battle" }).click();

    await expect(page.getByRole("heading", { name: "A battle begins: Sale day" })).toBeVisible();
    // UI rule 7: the type is a colour, an icon and a word.
    await expect(page.getByText("Type: Traffic")).toBeVisible();
    await expect(page.getByText("A sale starts at noon. Ten times more people open the shop.")).toBeVisible();
    await expect(page.getByText("Opponent HP 4 of 4")).toBeVisible();
    for (const creature of ["Cache", "Cookie", "Proxy"]) await page.getByLabel(creature).check();
    await page.getByRole("button", { name: "Start the battle" }).click();

    // The scene fills the screen. The session under it is hidden; the speaker and Feedback buttons stay.
    const scene = page.getByRole("region", { name: "Battle: Sale day" });
    await expect(scene).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Finish" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Feedback" })).toBeVisible();
    await expect(page.getByText("Opponent HP 4 of 4")).toBeAttached();
    await expect(page.getByText("Cache HP 3 of 3")).toBeAttached();

    // Turn 1. UI rule 3: the threat and the Constraint come before the moves.
    const panel = battlePanel(page);
    await expect(panel.getByRole("heading", { name: "Turn 1 of 3" })).toBeFocused();
    // Measure once the panel has slid all the way up.
    await panelSettled(page);
    await expect(panel.getByText("Every visitor downloads the same logo and styles again.")).toBeVisible();
    const constraint = panel.getByText("The logo changes once a year.");
    const firstMove = panel.getByRole("button", { name: "TTL (Cache)" });
    expect((await constraint.boundingBox())!.y).toBeLessThan((await firstMove.boundingBox())!.y);
    // Only the team's moves: No store is not a move for this threat.
    await expect(panel.getByRole("button", { name: "No store (Cache)" })).toHaveCount(0);
    if (isPhone) await expectPanelBelowTheCreatures(page);
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

    // A weak move: HttpOnly does no damage here. The Reason comes before the result; own words are optional.
    await panel.getByRole("button", { name: "HttpOnly (Cookie)" }).click();
    await expect(panel.getByRole("heading", { name: "Why HttpOnly?" })).toBeFocused();
    await expect(panel.getByRole("button", { name: SALE_DAY_REASONS[0].right })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Add your own words (optional)" }).click();
    // The cursor goes into the box at once.
    await expect(page.getByLabel("Your own words (optional)")).toBeFocused();
    await page.getByLabel("Your own words (optional)").fill("Scripts cannot read the cookie.");
    await pickReason(page, SALE_DAY_REASONS[0].right);

    // UI rules 4 and 5, and design 7.3: your HP drops on a weak move.
    await expect(panel.getByText("No effect · 0 ○○")).toBeVisible();
    await expect(panel.getByText("You chose HttpOnly. Scripts cannot read the cookie, but the page is still slow.")).toBeVisible();
    await expect(panel.getByText("The opponent hits back: −2 HP.")).toBeVisible();
    await expect(page.getByText("Cache HP 1 of 3")).toBeAttached();
    if (isPhone) await expectPanelBelowTheCreatures(page);
    await nextTurn(page);

    // Turn 2: TTL is no help against old prices. Cache loses its last HP, Faints, and Cookie comes in next.
    await expect(panel.getByRole("heading", { name: "Turn 2 of 3" })).toBeFocused();
    await expect(panel.getByText("The price changes every minute during the sale.")).toBeVisible();
    await playMove(page, "TTL (Cache)", SALE_DAY_REASONS[1].right);
    await expect(panel.getByText("The opponent hits back: −2 HP. Cache fainted! Cookie comes in next.")).toBeVisible();
    await expect(page.getByText("Cache HP 0 of 3")).toBeAttached();
    await nextTurn(page);

    // Turn 3: Cookie is in now. CDN is the best move, but a wrong Reason makes the hit 1 weaker and names the right one.
    await expect(page.getByText("Cookie HP 2 of 3")).toBeAttached();
    await expect(scene.getByText("Team 2/3")).toBeVisible();
    await playMove(page, "CDN (Proxy)", SALE_DAY_REASONS[2].wrong[1]);
    await expect(panel.getByText("Hit · 1 ●○")).toBeVisible();
    await expect(
      panel.getByText(`Wrong Reason. The right one: “${SALE_DAY_REASONS[2].right}” Your hit lost 1.`),
    ).toBeVisible();
    await expect(panel.getByText("Best move. No hit back.")).toBeVisible();
    await expect(page.getByText("Opponent HP 3 of 4")).toBeAttached();
    await nextTurn(page, true);

    // The end-of-Battle screen (#104): the result and the counts, then every turn on one screen.
    await expect(page.getByRole("heading", { name: "You lost this time" })).toBeFocused();
    await expect(
      page.getByText("Out of turns. The opponent still has HP 3 of 4. The moves you used come back in tomorrow's review."),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Battle: Sale day" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Your battle in numbers" }).getByRole("listitem")).toHaveText([
      "1/3best moves",
      "2/3right Reasons",
      "Lostresult",
    ]);
    const turns = page.getByRole("article");
    await expect(turns).toHaveCount(3);
    const [turn1, turn2, turn3] = [1, 2, 3].map((n) => page.getByRole("article", { name: `Turn ${n}` }));
    await expect(turn1).toContainText("Every visitor downloads the same logo and styles again.");
    await expect(turn1).toContainText("Constraint The logo changes once a year.");
    await expect(turn1).toContainText("Not best You: HttpOnly (Cookie) · Best: TTL (Cache)");
    await expect(turn1).toContainText(`Right Reason Your Reason: “${SALE_DAY_REASONS[0].right}”`);
    await expect(turn1).toContainText("Give the logo and styles a long TTL.");
    await expect(turn2).toContainText("Not best You: TTL (Cache) · Best: No store (Cache)");
    await expect(turn3).toContainText("Best move You: CDN (Proxy)");
    await expect(turn3).toContainText(
      `Wrong Reason Your Reason: “${SALE_DAY_REASONS[2].wrong[1]}” The right one: “${SALE_DAY_REASONS[2].right}”`,
    );
    await expect(page.getByRole("checkbox")).toHaveCount(9);
    await page.getByLabel("The logo and styles rarely change.").check();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    // Continue saves the ticks: one check per turn, also for the turns with no ticks.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();

    // The v2 fields of each turn are written at play time (ADR 0001).
    await expect
      .poll(() =>
        sql(
          local,
          `select turn_number, move_id, damage, best_move, battle_kind, move_damage, reason_index, reason_correct, hp_lost,
                  skill_ids, constraint_variant, why_text
             from battle_turn_events t join auth.users u on u.id = t.user_id where u.email = $1 order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        {
          turn_number: 1,
          move_id: "cookie.http-only",
          damage: 0,
          best_move: false,
          battle_kind: "battle",
          move_damage: 0,
          reason_index: 0,
          reason_correct: true,
          hp_lost: 2,
          skill_ids: [3],
          constraint_variant: "main",
          why_text: "Scripts cannot read the cookie.",
        },
        {
          turn_number: 2,
          move_id: "cache.ttl",
          damage: 0,
          best_move: false,
          battle_kind: "battle",
          move_damage: 0,
          reason_index: 1,
          reason_correct: true,
          hp_lost: 2,
          skill_ids: [3, 10],
          constraint_variant: "main",
          why_text: null,
        },
        {
          turn_number: 3,
          move_id: "proxy.cdn",
          damage: 1,
          best_move: true,
          battle_kind: "battle",
          move_damage: 2,
          // The Reason is logged by its index in the file: the right one of turn 3 is the last one.
          reason_index: 1,
          reason_correct: false,
          hp_lost: 0,
          skill_ids: [2],
          constraint_variant: "main",
          why_text: null,
        },
      ]);
    await expect
      .poll(() =>
        sql(
          local,
          `select result, turns_used, team, battle_kind, faints from battle_events b join auth.users u on u.id = b.user_id
            where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ result: "lost", turns_used: 3, team: ["cache", "cookie", "proxy"], battle_kind: "battle", faints: 1 }]);
    // The self-check still feeds the review schedule: one check per turn, with the turn's best move.
    await expect
      .poll(() =>
        sql(
          local,
          `select turn_number, best_move_id, ticked_points from battle_check_events c join auth.users u on u.id = c.user_id
            where u.email = $1 order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { turn_number: 1, best_move_id: "cache.ttl", ticked_points: [1] },
        { turn_number: 2, best_move_id: "cache.no-store", ticked_points: [] },
        { turn_number: 3, best_move_id: "proxy.cdn", ticked_points: [] },
      ]);

    // The summary shows the best-move rate as the learning number, never the win rate.
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Best moves in Fixture Town: 33% (1 of 3 turns)")).toBeVisible();
    await expect(page.getByText(/win rate|battles won/i)).toHaveCount(0);

    // One battle per day.
    await page.getByRole("button", { name: "Back home" }).click();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a won Battle: the opponent's HP reaches 0, and the end screen says so", async ({ page }) => {
  const user = await signInNewUser(page, "battle-v2-won");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await startSaleDay(page);
    const panel = battlePanel(page);
    await playMove(page, "TTL (Cache)", SALE_DAY_REASONS[0].right);
    await expect(panel.getByText("Strong hit · 2 ●●")).toBeVisible();
    await expect(panel.getByText("Best move. No hit back.")).toBeVisible();
    await expect(page.getByText("Opponent HP 2 of 4")).toBeAttached();
    await nextTurn(page);
    await playMove(page, "No store (Cache)", SALE_DAY_REASONS[1].right);
    await expect(panel.getByText("Sale day is down!")).toBeVisible();
    await expect(page.getByText("Opponent HP 0 of 4")).toBeAttached();
    await nextTurn(page, true);
    await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
    await expect(page.getByText("The opponent's HP reached 0 in 2 turns.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Your battle in numbers" }).getByRole("listitem")).toHaveText([
      "2/2best moves",
      "2/2right Reasons",
      "Wonresult",
    ]);
    // The best move needs no "Best:" next to it.
    await expect(page.getByRole("article", { name: "Turn 1" })).toContainText("Best move You: TTL (Cache)");
    await expect(page.getByRole("article", { name: "Turn 1" })).not.toContainText("Best: ");
    await expect(page.getByRole("checkbox")).toHaveCount(6);
    await expect
      .poll(() =>
        sql(local, `select result, faints from battle_events b join auth.users u on u.id = b.user_id where u.email = $1`, [
          user.email,
        ]),
      )
      .toEqual([{ result: "won", faints: 0 }]);
  } finally {
    await user.forget();
  }
});

/** Wins "Sale day" with TTL, then No store, both with the right Reason, and opens the end screen. */
async function winSaleDay(page: Page) {
  await startSaleDay(page);
  await playMove(page, "TTL (Cache)", SALE_DAY_REASONS[0].right);
  await nextTurn(page);
  await playMove(page, "No store (Cache)", SALE_DAY_REASONS[1].right);
  await nextTurn(page, true);
  await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
}

/** The self-checks saved for this learner, one row per turn. */
const savedChecks = (email: string) =>
  sql(
    local,
    `select turn_number, best_move_id, ticked_points from battle_check_events c join auth.users u on u.id = c.user_id
      where u.email = $1 order by turn_number`,
    [email],
  );

test("leaving the end screen with Finish saves the ticks: one check per turn, none for an unticked turn", async ({ page }) => {
  const user = await signInNewUser(page, "battle-end-finish");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await winSaleDay(page);
    await page.getByLabel("No store stops every cache from keeping it.").check();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("heading", { name: /^Session (saved|not saved yet)$/ })).toBeVisible();
    await expect
      .poll(() => savedChecks(user.email))
      .toEqual([
        { turn_number: 1, best_move_id: "cache.ttl", ticked_points: [] },
        { turn_number: 2, best_move_id: "cache.no-store", ticked_points: [2] },
      ]);
  } finally {
    await user.forget();
  }
});

test("when the page hides on the end screen, the ticks are saved once and stay as they are", async ({ page }) => {
  const user = await signInNewUser(page, "battle-end-hide");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await winSaleDay(page);
    await page.getByLabel("The logo and styles rarely change.").check();
    // iPhone Safari may close a hidden tab and never say so, so a hidden page saves at once.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByText("Your ticks are saved. They change only your review schedule.")).toBeVisible();
    await expect(page.getByLabel("A TTL lets browsers reuse their copy.")).toBeDisabled();
    // Back on the page: Continue does not save a second time.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();
    await expect
      .poll(() => savedChecks(user.email))
      .toEqual([
        { turn_number: 1, best_move_id: "cache.ttl", ticked_points: [1] },
        { turn_number: 2, best_move_id: "cache.no-store", ticked_points: [] },
      ]);
  } finally {
    await user.forget();
  }
});

test("a fast double tap on a move does not also pick the Reason under the finger", async ({ page }) => {
  const user = await signInNewUser(page, "battle-v2-double-tap");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await startSaleDay(page);
    await panelSettled(page);
    // Two taps one frame apart: the first on TTL, the second on the first Reason, which shows by then.
    const secondTapHit = await page.evaluate(async (reason) => {
      const buttons = () => [...document.querySelectorAll('[data-testid="battle-panel"] button')] as HTMLButtonElement[];
      buttons()
        .find((button) => button.textContent?.startsWith("TTL"))!
        .click();
      await new Promise((frame) => requestAnimationFrame(frame));
      const reasonButton = buttons().find((button) => button.textContent === reason);
      reasonButton?.click();
      return reasonButton !== undefined;
    }, SALE_DAY_REASONS[0].right);
    expect(secondTapHit).toBe(true);
    // The second tap is ignored: the Reasons wait for a real pick, and no turn is saved.
    await expect(battlePanel(page).getByRole("heading", { name: "Why TTL?" })).toBeVisible();
    await expect(battlePanel(page).getByText("Turn 1 result")).toHaveCount(0);
    await pickReason(page, SALE_DAY_REASONS[0].right);
    await expect(battlePanel(page).getByText("Strong hit · 2 ●●")).toBeVisible();
    await expect
      .poll(() =>
        sql(local, `select reason_index from battle_turn_events t join auth.users u on u.id = t.user_id where u.email = $1`, [
          user.email,
        ]),
      )
      .toEqual([{ reason_index: 0 }]);
  } finally {
    await user.forget();
  }
});

test("Leave on the scene ends the session like Finish, and saves only the turns played", async ({ page }) => {
  const user = await signInNewUser(page, "battle-v2-leave");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await startSaleDay(page);
    await playMove(page, "TTL (Cache)", SALE_DAY_REASONS[0].right);
    await nextTurn(page);
    // Design 3: a session can end at any time, also in the middle of a Battle.
    const leave = battlePanel(page).getByRole("button", { name: "Leave" });
    await panelSettled(page);
    const box = (await leave.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await leave.click();
    await expect(page.getByRole("heading", { name: /^Session (saved|not saved yet)$/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Battle: Sale day" })).toHaveCount(0);
    await expect
      .poll(async () => {
        const [turns] = await sql<{ count: string }>(
          local,
          `select count(*) from battle_turn_events t join auth.users u on u.id = t.user_id where u.email = $1`,
          [user.email],
        );
        const [ends] = await sql<{ count: string }>(
          local,
          `select count(*) from battle_events b join auth.users u on u.id = b.user_id where u.email = $1`,
          [user.email],
        );
        const [sessions] = await sql<{ count: string }>(
          local,
          // A session saves its time more than once, so count sessions, not rows.
          `select count(distinct s.session_id) from session_events s join auth.users u on u.id = s.user_id where u.email = $1`,
          [user.email],
        );
        return { turns: Number(turns.count), ends: Number(ends.count), sessions: Number(sessions.count) };
      })
      .toEqual({ turns: 1, ends: 0, sessions: 1 });
  } finally {
    await user.forget();
  }
});

test.describe("with reduce motion on in the phone", () => {
  test.use({ reducedMotion: "reduce" });

  test("a turn with a hit back and a Faint plays with no movement and no flash, and the text says it all", async ({ page }) => {
    const user = await signInNewUser(page, "battle-v2-still");
    try {
      await catchItems(user.email, ["cache", "cookie", "proxy"]);
      await startSaleDay(page);
      const panel = battlePanel(page);
      await expect(panel.getByRole("heading", { name: "Turn 1 of 3" })).toBeVisible();
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

      await playMove(page, "HttpOnly (Cookie)", SALE_DAY_REASONS[0].right);
      // The result shows at once: nothing waits for an effect.
      await expect(page.getByRole("button", { name: "Next turn" })).toBeVisible();
      await page.getByRole("button", { name: "Next turn" }).click();
      await playMove(page, "TTL (Cache)", SALE_DAY_REASONS[1].right);
      await expect(panel.getByText("The opponent hits back: −2 HP. Cache fainted! Cookie comes in next.")).toBeVisible();
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      // No rising words over the creatures: they would only move. The panel says the same.
      await expect(page.locator(".battle-pop").first()).toBeHidden();
      // The Fainted creature is gone at once instead of fading out.
      await expect(page.getByTestId("my-creature").locator("img")).toBeHidden();
    } finally {
      await user.forget();
    }
  });
});
