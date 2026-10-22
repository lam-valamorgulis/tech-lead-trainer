import { expect, test, type Page } from "@playwright/test";
import { battlePanel, nextTurn, panelSettled, playMove, SALE_DAY_REASONS } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C uses the fixture town: 5 copies of "Sale day", won with TTL, then No store.

// These tests are about the Gym, not the Battle effects (battle.spec.ts covers those). With
// reduced motion each turn's result shows at once, so 5 battles fit in the test time.
test.use({ reducedMotion: "reduce" });

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

/** Plays turn `turn` (0, 1 or 2) with the right Reason. */
async function playTurn(page: Page, move: string, turn: number, last: boolean) {
  await playMove(page, move, SALE_DAY_REASONS[turn].right);
  await nextTurn(page, last);
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
    await playTurn(page, "TTL (Cache)", 0, false);
    await playTurn(page, "No store (Cache)", 1, true);
    await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
  } else {
    await playTurn(page, "HttpOnly (Cookie)", 0, false);
    await playTurn(page, "TTL (Cache)", 1, false);
    await playTurn(page, "No store (Cache)", 2, true);
    await expect(page.getByRole("heading", { name: "You lost this time" })).toBeVisible();
  }
  // Continue saves the ticks of the end screen (#104) and goes to the next Gym battle.
  await page.getByRole("button", { name: "Continue" }).click();
}

test("the Gym: 5 battles in a row, 4 wins give the badge, and the badge shows on the map", async ({ page }) => {
  // Several full Battles with every effect: about 30 seconds on a busy machine, so it gets more time.
  test.setTimeout(60_000);
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
    // The Gym's time counts as learning time: its session is saved like a 45-minute day.
    await expect
      .poll(() =>
        sql<{ committed_minutes: number }>(
          local,
          `select distinct s.committed_minutes from session_events s join gym_events g on g.session_id = s.session_id
             join auth.users u on u.id = g.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ committed_minutes: 45 }]);

    await page.getByRole("link", { name: "Back home" }).click();
    // The badge is earned, so home stops offering the Gym.
    await expect(page.getByText("Today I commit to:")).toBeVisible();
    await expect(page.getByRole("link", { name: "Enter the Gym" })).toHaveCount(0);
    await page.getByRole("link", { name: "Map" }).click();
    await expect(page.getByRole("heading", { name: "Badges" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Town 1: Fixture Town" })).toBeVisible();
    // #111: the town's own page shows its badge too.
    await page.getByRole("link", { name: /^Town 1 / }).click();
    await expect(page.getByText(/Badge earned · \d{1,2} \w{3} \d{4}$/)).toBeVisible({ timeout: 15_000 });
  } finally {
    await user.forget();
  }
});

test("a Gym ends after 2 losses, gives no badge, and can be tried again", async ({ page }) => {
  // Several full Battles with every effect: about 30 seconds on a busy machine, so it gets more time.
  test.setTimeout(60_000);
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

/** The learner played "Sale day" once, 3 days ago, so its Gym twin "Sale day, new logo" is an old situation now. */
async function playedSaleDay(email: string) {
  await sql(
    local,
    `insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
       turn_number, move_id, damage, best_move, battle_kind, move_damage, reason_index, reason_correct, hp_lost, constraint_variant)
     select id, gen_random_uuid(), gen_random_uuid(), now() - interval '3 days', gen_random_uuid(), 't99-sale-day', '0123456789abcdef',
       1, 'cache.ttl', 2, true, 'battle', 2, 0, true, 0, 'main'
     from auth.users where email = $1`,
    [email],
  );
}

test("a Gym twin replays an old battle with a reversed Constraint: last time's best move now loses (#113)", async ({ page }) => {
  test.setTimeout(60_000);
  const user = await signInNewUser(page, "gym-twin");
  try {
    await setUpLastWeek(user.email);
    await playedSaleDay(user.email);
    await page.goto("/gym/t99");
    await expect(page.getByText(/^1 battle is a rematch: a situation you met before, with a changed Constraint\./)).toBeVisible();
    await page.getByRole("button", { name: "Start the Gym" }).click();

    // The twin comes first. Sale day was played, so no worked example comes before it.
    await expect(page.getByText(/^Gym battle 1 of 5/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "A battle begins: Sale day, new logo" })).toBeVisible();
    await expect(page.getByText(/^A rematch: Sale day\. The threats are the same as last time\. One Constraint changed/)).toBeVisible();
    for (const creature of ["Cache", "Cookie", "Proxy"]) await page.getByLabel(creature).check();
    await page.getByRole("button", { name: "Start the battle" }).click();

    // Turn 1: the old threat, word for word, and the Constraint marked as changed, with last time's.
    await panelSettled(page);
    await expect(battlePanel(page).getByText("Every visitor downloads the same logo and styles again.")).toBeVisible();
    await expect(battlePanel(page).getByText("Constraint changed")).toBeVisible();
    await expect(battlePanel(page).getByText("The logo changes every hour during the sale.")).toBeVisible();
    await expect(battlePanel(page).getByText("Last time: The logo changes once a year.")).toBeVisible();
    // TTL, last time's best move, now does no damage.
    await playMove(page, "TTL (Cache)", "The shop can clear a CDN copy, but not the copy in each browser.");
    await expect(battlePanel(page).getByText(/^No effect · 0/)).toBeVisible();
    await nextTurn(page);
    // Turn 2 is a copy of Sale day: its Constraint did not change.
    await panelSettled(page);
    await expect(battlePanel(page).getByText("Constraint", { exact: true })).toBeVisible();
    await expect(battlePanel(page).getByText(/^Last time:/)).toHaveCount(0);
    await playMove(page, "No store (Cache)", SALE_DAY_REASONS[1].right);
    await nextTurn(page);
    await playMove(page, "CDN (Proxy)", SALE_DAY_REASONS[2].right);
    await nextTurn(page, true);
    await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
    // The end screen names last time's best move on the reversed turn.
    const turn1 = page.getByRole("article", { name: "Turn 1" });
    await expect(turn1.getByText("Constraint changed")).toBeVisible();
    // "logo" is a glossary word: its hidden definition sits inside the line, so the line is matched in two parts.
    await expect(turn1.locator(".battle-end-old")).toHaveText(/^Last time: The logo changes once a year\..* The best move was TTL\.$/);
    await expect(turn1.getByText(/Best: CDN/)).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // The other Gym battles are normal ones. Two losses end the Gym, and its result shows.
    await gymBattle(page, 2, false);
    await gymBattle(page, 3, false);
    await expect(page.getByRole("heading", { name: "No badge this time" })).toBeVisible();
    await expect(page.getByText("You won 1 of 3 battles. The badge needs 4 wins. Try again any time.")).toBeVisible();

    // The reversed turn is logged with its Constraint variant; the copied turns keep "main".
    await expect
      .poll(() =>
        sql(
          local,
          `select turn_number, move_id, best_move, damage, constraint_variant from battle_turn_events t join auth.users u on u.id = t.user_id
            where u.email = $1 and scenario_id = 't99-sale-day-new-logo' order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { turn_number: 1, move_id: "cache.ttl", best_move: false, damage: 0, constraint_variant: "reversed" },
        { turn_number: 2, move_id: "cache.no-store", best_move: true, damage: 2, constraint_variant: "main" },
        { turn_number: 3, move_id: "proxy.cdn", best_move: true, damage: 2, constraint_variant: "main" },
      ]);
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
