import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { catchItems } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C runs on the fixture town. Its scenario "Sale day" is won with TTL, then No store.

/**
 * The iPhone keyboard with its suggestion bar is about 336 px tall in portrait (estimate).
 * Playwright cannot open it, so the test checks that the box and its button sit above it.
 */
const KEYBOARD_HEIGHT = 336;

async function playTurn(page: Page, move: string, why: string, isPhone: boolean) {
  await page.getByLabel(move).check();
  const whyBox = page.getByLabel("Why this move?");
  const makeMove = page.getByRole("button", { name: "Make the move" });
  await expect(makeMove).toBeDisabled();
  await whyBox.focus();
  if (isPhone) await expectAboveKeyboard(page, whyBox, makeMove);
  await whyBox.fill(why);
  await makeMove.click();
}

async function expectAboveKeyboard(page: Page, whyBox: Locator, makeMove: Locator) {
  const visibleHeight = page.viewportSize()!.height - KEYBOARD_HEIGHT;
  await expect
    .poll(async () => {
      const [box, button] = [await whyBox.boundingBox(), await makeMove.boundingBox()];
      return box !== null && button !== null && box.y >= 0 && button.y + button.height <= visibleHeight;
    })
    .toBe(true);
}

test("a full battle: team pick, threat first, why before the result, damage and counterattack", async ({ page }, testInfo) => {
  const isPhone = testInfo.project.name === "iphone";
  const user = await signInNewUser(page, "battle");
  try {
    // Caught today, so today has no catch and no review: the battle comes first.
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await page.getByRole("button", { name: "15 minutes" }).click();

    // The first battle with Cache and Proxy starts with their worked examples, one at a time.
    await expect(page.getByRole("heading", { name: "Worked example: Cache" })).toBeFocused();
    await expect(page.getByText("The product page loads slowly for every visitor.")).toBeVisible();
    await expect(page.getByText("Cache the logo and the styles. Keep the price fresh.")).toBeVisible();
    await page.getByRole("button", { name: "Next example" }).click();
    await expect(page.getByRole("heading", { name: "Worked example: Proxy" })).toBeFocused();
    await page.getByRole("button", { name: "Go to the battle" }).click();
    // Then the examples hide.
    await expect(page.getByText("The product page loads slowly for every visitor.")).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "A battle begins: Sale day" })).toBeVisible();
    // UI rule 4: the type is a colour, an icon and a word.
    await expect(page.getByText("Type: Traffic")).toBeVisible();
    await expect(page.getByText("A sale starts at noon. Ten times more people open the shop.")).toBeVisible();
    await expect(page.getByText("Opponent HP 4 of 4")).toBeVisible();

    const start = page.getByRole("button", { name: "Start the battle" });
    await page.getByLabel("Cache").check();
    await page.getByLabel("Proxy").check();
    await expect(start).toBeDisabled();
    await page.getByLabel("Cookie").check();

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await start.click();

    // UI rule 1: the threat comes before the moves.
    await expect(page.getByRole("heading", { name: "Turn 1 of 3" })).toBeFocused();
    await expect(page.getByText("Every visitor downloads the same logo and styles again.")).toBeVisible();
    await expect(page.getByLabel("No store (Cache)")).toHaveCount(0);
    await playTurn(page, "TTL (Cache)", "The logo rarely changes, so a copy can live for an hour.", isPhone);

    // UI rules 2 and 3.
    await expect(page.getByText("Strong hit · 2 ●●")).toBeVisible();
    await expect(page.getByText("You chose TTL. The logo loads fast, but a new logo takes an hour to show.")).toBeVisible();
    await expect(page.getByText("Opponent HP 2 of 4")).toBeVisible();
    await page.getByRole("button", { name: "See the model answer" }).click();

    // Design 7.7: the model answer and its 3 key points, next to the learner's own why.
    await expect(page.getByRole("heading", { name: "Model answer" })).toBeFocused();
    await expect(page.getByText("Your why: The logo rarely changes, so a copy can live for an hour.")).toBeVisible();
    await expect(page.getByText("Give the logo and styles a long TTL.", { exact: false })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(3);
    await page.getByLabel("The logo and styles rarely change.").check();
    await page.getByLabel("A new logo shows only after the TTL ends.").check();
    const ticks = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(ticks.violations).toEqual([]);
    await page.getByRole("button", { name: "Next turn" }).click();

    await expect(page.getByRole("heading", { name: "Turn 2 of 3" })).toBeFocused();
    // The last counterattack stays on screen, so the learner handles its result.
    await expect(
      page.getByText("Last turn: You chose TTL. The logo loads fast, but a new logo takes an hour to show."),
    ).toBeVisible();
    await playTurn(page, "No store (Cache)", "A price must never come from an old copy.", isPhone);
    await expect(page.getByText("Opponent HP 0 of 4")).toBeVisible();
    await page.getByRole("button", { name: "See the model answer" }).click();
    await expect(page.getByRole("heading", { name: "Model answer" })).toBeFocused();
    // No ticks this time: No store comes back for review tomorrow.
    await page.getByRole("button", { name: "See how it ended" }).click();

    await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();

    await expect
      .poll(() =>
        sql<{ turn_number: number; move_id: string; damage: number; best_move: boolean }>(
          local,
          `select turn_number, move_id, damage, best_move from battle_turn_events t join auth.users u on u.id = t.user_id
            where u.email = $1 order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { turn_number: 1, move_id: "cache.ttl", damage: 2, best_move: true },
        { turn_number: 2, move_id: "cache.no-store", damage: 2, best_move: true },
      ]);
    await expect
      .poll(() =>
        sql<{ result: string; turns_used: number; team: string[] }>(
          local,
          `select result, turns_used, team from battle_events b join auth.users u on u.id = b.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ result: "won", turns_used: 2, team: ["cache", "cookie", "proxy"] }]);
    await expect
      .poll(() =>
        sql<{ turn_number: number; best_move_id: string; ticked_points: number[] }>(
          local,
          `select turn_number, best_move_id, ticked_points from battle_check_events c join auth.users u on u.id = c.user_id
            where u.email = $1 order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { turn_number: 1, best_move_id: "cache.ttl", ticked_points: [1, 3] },
        { turn_number: 2, best_move_id: "cache.no-store", ticked_points: [] },
      ]);

    // The summary shows the best-move rate as the learning number, never the win rate.
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Best moves in Fixture Town: 100% (2 of 2 turns)")).toBeVisible();
    await expect(page.getByText(/win rate|battles won/i)).toHaveCount(0);

    // One battle per day.
    await page.getByRole("button", { name: "Back home" }).click();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});
