import { expect, type Page } from "@playwright/test";
import { local } from "./e2e";
import { sql } from "./local-admin";

/**
 * The 3 Reasons of each turn of the fixture battle "Sale day" (#93), right one first. The best
 * moves are TTL, then No store, then CDN.
 */
export const SALE_DAY_REASONS = [
  { right: "A rarely changed file is safe to keep for long.", wrong: ["A long TTL makes prices fresh.", "Browsers never keep logos."] },
  { right: "A price must never come from an old copy.", wrong: ["No store makes every page faster.", "A CDN always has the newest price."] },
  { right: "A copy near the visitor cuts the travel time.", wrong: ["No store makes far pages faster.", "A cookie makes the page lighter."] },
];

/** The panel at the bottom of the Battle scene (#103): threat, Constraint, moves, Reasons, then the result. */
export const battlePanel = (page: Page) => page.getByTestId("battle-panel");

/**
 * Waits until the panel is on screen and has stopped sliding. The panel slides up in steps, and a
 * tap while it moves can land next to the button. (Chrome's viewport check sometimes reports a
 * sliding panel as off screen after it stopped, so this asks the animations instead.)
 */
export async function panelSettled(page: Page) {
  await expect(battlePanel(page)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => (animation as CSSAnimation).animationName === "fx-slide" && animation.playState !== "finished").length,
      ),
    )
    .toBe(0);
}

/**
 * Plays one turn of the Battle scene: a move, then a Reason when the turn has Reasons. `note`
 * fills the optional box for the learner's own words first.
 */
export async function playMove(page: Page, move: string, reason?: string, note?: string) {
  await panelSettled(page);
  await battlePanel(page).getByRole("button", { name: move }).click();
  if (reason === undefined) return;
  if (note !== undefined) {
    await page.getByRole("button", { name: "Add your own words (optional)" }).click();
    await page.getByLabel("Your own words (optional)").fill(note);
  }
  await battlePanel(page).getByRole("button", { name: reason, exact: true }).click();
}

/** Waits for the result panel to open after the effects, then goes on. */
export async function nextTurn(page: Page, last = false) {
  const next = page.getByRole("button", { name: last ? "See how it ended" : "Next turn" });
  await expect(next).toBeVisible();
  await panelSettled(page);
  await next.click();
}

/**
 * Seeds a catch of each item for this email. With `daysAgo` 0 the items were caught today, so
 * today has no catch and no review of them. With `daysAgo` 1 each one is due for review today.
 */
export async function catchItems(email: string, itemIds: string[], daysAgo = 0) {
  for (const itemId of itemIds) {
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $3), $2,
              case when position('.' in $2) > 0 then 'move' else 'creature' end, '0123456789abcdef', 'seed', true, 3,
              'before-card' from u`,
      [email, itemId, daysAgo],
    );
  }
}
