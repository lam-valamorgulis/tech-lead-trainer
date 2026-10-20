import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C uses the fixture town: 5 copies of "Sale day", won with TTL, then No store.

/** Day 1 was 25 days ago, so today is in the last week of town 1: its Gym is open. */
async function setUpLastWeek(email: string) {
  await sql(local, "update profiles set program_start_date = current_date - 25 where user_id = (select id from auth.users where email = $1)", [email]);
  for (const itemId of ["cache", "cookie", "proxy"]) {
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now() - interval '2 days', $2, 'creature', '0123456789abcdef',
              'seed', true, 3, 'before-card' from u`,
      [email, itemId],
    );
  }
}

async function playTurn(page: Page, move: string, last: boolean) {
  await page.getByLabel(move).check();
  await page.getByLabel("Why this move?").fill("It fits this threat.");
  await page.getByRole("button", { name: "Make the move" }).click();
  await page.getByRole("button", { name: "See the model answer" }).click();
  await page.getByRole("button", { name: last ? "See how it ended" : "Next turn" }).click();
}

async function gymBattle(page: Page, battle: number, win: boolean) {
  await expect(page.getByText(new RegExp(`^Gym battle ${battle} of 5`))).toBeVisible();
  if (battle === 1) {
    // The first Gym battle shows the worked examples of Cache and Proxy, once.
    await page.getByRole("button", { name: "Next example" }).click();
    await page.getByRole("button", { name: "Go to the battle" }).click();
  }
  for (const creature of ["Cache", "Cookie", "Proxy"]) await page.getByLabel(creature).check();
  await page.getByRole("button", { name: "Start the battle" }).click();
  if (win) {
    await playTurn(page, "TTL (Cache)", false);
    await playTurn(page, "No store (Cache)", true);
    await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
  } else {
    await playTurn(page, "HttpOnly (Cookie)", false);
    await playTurn(page, "TTL (Cache)", false);
    await playTurn(page, "No store (Cache)", true);
    await expect(page.getByRole("heading", { name: "You lost this time" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Continue" }).click();
}

test("the Gym: 5 battles in a row, 4 wins give the badge, and the badge shows on the map", async ({ page }) => {
  const user = await signInNewUser(page, "gym");
  try {
    await setUpLastWeek(user.email);
    await page.reload();
    await page.getByRole("link", { name: "Enter the Gym" }).click();
    await expect(page.getByRole("heading", { name: "Gym of Fixture Town" })).toBeVisible();
    await page.getByRole("button", { name: "Start the Gym" }).click();

    for (const battle of [1, 2, 3, 4]) await gymBattle(page, battle, true);
    // 4 wins already, but the Gym is 5 battles in a row.
    await gymBattle(page, 5, false);
    await expect(page.getByRole("heading", { name: "You earned the Fixture Town badge!" })).toBeVisible();
    await expect(page.getByText("You won 4 of 5 battles.")).toBeVisible();

    await expect
      .poll(() =>
        sql<{ wins: number; passed: boolean; battles: number }>(
          local,
          `select wins, passed, cardinality(battle_ids) as battles from gym_events g join auth.users u on u.id = g.user_id
            where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ wins: 4, passed: true, battles: 5 }]);

    await page.getByRole("link", { name: "Back home" }).click();
    await page.getByRole("link", { name: "Map" }).click();
    await expect(page.getByRole("heading", { name: "Badges" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Town 1: Fixture Town" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a Gym ends after 2 losses, gives no badge, and can be tried again", async ({ page }) => {
  const user = await signInNewUser(page, "gym-lost");
  try {
    await setUpLastWeek(user.email);
    await page.goto("/gym/t99");
    await page.getByRole("button", { name: "Start the Gym" }).click();
    await gymBattle(page, 1, false);
    await gymBattle(page, 2, false);
    await expect(page.getByRole("heading", { name: "No badge this time" })).toBeVisible();
    await expect(page.getByText("You won 0 of 2 battles. The badge needs 4 wins. Try again any time.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Start the Gym" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("before the town's last week, the Gym is closed and home does not offer it", async ({ page }) => {
  const user = await signInNewUser(page, "gym-early");
  try {
    await expect(page.getByText("Today I commit to:")).toBeVisible();
    await expect(page.getByRole("link", { name: "Enter the Gym" })).toHaveCount(0);
    await page.goto("/gym/t99");
    await expect(page.getByText(/^The Gym of Fixture Town opens on \d{1,2} \w{3} \d{4}/)).toBeVisible();
  } finally {
    await user.forget();
  }
});
