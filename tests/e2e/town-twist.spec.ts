import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { catchItems } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Ticket #36. Seam C has a fixture town 2, "Fixture Town Two", with the two-types twist.
// Its battle "Public API launch" is Traffic + Security, won with Quota, then Key rotation.

/** Day 1 was 40 days ago, so the learner is in town 2 (it starts after one month). */
async function moveToTown2(email: string) {
  await sql(local, "update profiles set program_start_date = current_date - 40 where user_id = (select id from auth.users where email = $1)", [
    email,
  ]);
}

async function playTurn(page: Page, move: string, why: string) {
  await page.getByLabel(move).check();
  await page.getByLabel("Why this move?").fill(why);
  await page.getByRole("button", { name: "Make the move" }).click();
}

test("the first learning day in town 2 shows the new town screen once, then the day goes on as usual", async ({ page }) => {
  const user = await signInNewUser(page, "new-town");
  try {
    // A learner in town 1 never sees it: home opens on the commit buttons.
    await expect(page.getByRole("heading", { name: "Today I commit to:" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Welcome to Town/ })).toHaveCount(0);

    await moveToTown2(user.email);
    await page.goto("/");
    const screen = page.getByRole("region", { name: "Welcome to Town 2" });
    await expect(screen).toBeVisible();
    await expect(screen.getByText("Fixture Town Two")).toBeVisible();
    await expect(screen.getByText("A new town is a fresh start: new creatures and new battles.")).toBeVisible();
    await expect(screen.getByText("New this month: Two-type opponents.")).toBeVisible();
    await expect(
      screen.getByText(
        "Each opponent has two types, and each turn shows the type that attacks. Damage still comes from the turn's move table, as in town 1.",
      ),
    ).toBeVisible();
    // #98: the Town Intro of the town comes with it, with its diagram and its source.
    await expect(screen.getByRole("heading", { name: "How an API keeps partners safe" })).toBeVisible();
    await expect(screen.getByText("Town Intro · about 3 minutes")).toBeVisible();
    await expect(screen.locator(".content-diagram svg")).toBeVisible();
    await expect(screen.getByText("Diagram: Partner to Gateway. Gateway to API")).toBeAttached();
    await expect(screen.getByRole("link", { name: /Source: MDN: 429 Too Many Requests/ })).toBeVisible();
    // The commit buttons wait until the learner starts the town.
    await expect(page.getByRole("button", { name: "15 minutes" })).toHaveCount(0);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await screen.getByRole("button", { name: "Start Town 2" }).click();
    await page.getByRole("button", { name: "3 minutes" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Back home" }).click();

    // The first session in town 2 started, so the screen never shows again.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Today I commit to:" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome to Town 2" })).toHaveCount(0);
  } finally {
    await user.forget();
  }
});

test("the map reopens the Town Intro of the current town (#98)", async ({ page }) => {
  const user = await signInNewUser(page, "town-intro-map");
  try {
    // In town 1, the fixture town has no Town Intro in seam C, so the map shows no link.
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: /^Town 1:/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Town Intro" })).toHaveCount(0);

    await moveToTown2(user.email);
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: /^Town 2:/ })).toBeVisible();
    await page.getByRole("link", { name: "Town Intro" }).click();
    // The dev server builds this page on its first visit, which can take a few seconds.
    await expect(page.getByText("Town 2: Fixture Town Two")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "How an API keeps partners safe" })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("link", { name: "Back to the map" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();

    // A town not reached yet stays closed, also by its address.
    await sql(local, "update profiles set program_start_date = current_date where user_id = (select id from auth.users where email = $1)", [
      user.email,
    ]);
    await page.goto("/town-intro/t98");
    await expect(page.getByText("Town 2 is not open yet.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "How an API keeps partners safe" })).toHaveCount(0);
  } finally {
    await user.forget();
  }
});

test("a two-type opponent shows both types, and each turn shows the type that attacks", async ({ page }) => {
  const user = await signInNewUser(page, "two-types");
  try {
    await moveToTown2(user.email);
    // Caught today, so today has no catch and no review: the battle comes first.
    await catchItems(user.email, ["rate-limit", "api-key"]);
    await page.goto("/");
    await page.getByRole("button", { name: "Start Town 2" }).click();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await page.getByRole("button", { name: "Next example" }).click();
    await page.getByRole("button", { name: "Go to the battle" }).click();

    await expect(page.getByRole("heading", { name: "A battle begins: Public API launch" })).toBeVisible();
    // UI rule 4 for both types: a colour, an icon and a word each.
    const types = page.getByRole("list", { name: "Two types:" }).getByRole("listitem");
    // The icons are hidden from screen readers, but they are part of the text.
    await expect(types).toHaveText([/Traffic$/, /Security$/]);
    await expect(
      page.getByText(
        "Two-type opponents. Each opponent has two types, and each turn shows the type that attacks. Damage still comes from the turn's move table, as in town 1.",
      ),
    ).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByLabel("Rate limit").check();
    await page.getByLabel("API key").check();
    await page.getByRole("button", { name: "Start the battle" }).click();

    await expect(page.getByRole("heading", { name: "Turn 1 of 3" })).toBeFocused();
    await expect(page.getByText("This turn attacks with: Traffic")).toBeVisible();
    await playTurn(page, "Quota (Rate limit)", "A quota stops one partner from using all the capacity.");
    await expect(page.getByText("Strong hit · 2 ●●")).toBeVisible();
    await page.getByRole("button", { name: "See the model answer" }).click();
    await page.getByRole("button", { name: "Next turn" }).click();

    await expect(page.getByRole("heading", { name: "Turn 2 of 3" })).toBeFocused();
    await expect(page.getByText("This turn attacks with: Security")).toBeVisible();
    const turnCheck = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(turnCheck.violations).toEqual([]);
    await playTurn(page, "Key rotation (API key)", "A leaked key must stop working at once.");
    await expect(page.getByText("Opponent HP 0 of 4")).toBeVisible();
    await page.getByRole("button", { name: "See the model answer" }).click();
    await page.getByRole("button", { name: "See how it ended" }).click();
    await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();

    await expect
      .poll(() =>
        sql<{ scenario_id: string; move_id: string; damage: number; best_move: boolean }>(
          local,
          `select scenario_id, move_id, damage, best_move from battle_turn_events t join auth.users u on u.id = t.user_id
            where u.email = $1 order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { scenario_id: "t98-public-api", move_id: "rate-limit.quota", damage: 2, best_move: true },
        { scenario_id: "t98-public-api", move_id: "api-key.rotate", damage: 2, best_move: true },
      ]);
  } finally {
    await user.forget();
  }
});
