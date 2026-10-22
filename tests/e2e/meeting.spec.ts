import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { battlePanel, catchItems, nextTurn, panelSettled, playMove } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C runs on the fixture town. Its Meeting Battle "Late launch" (#105): the client asks why
// the sale page is late. On each turn the facts answer is best (2), the vague one does 1, blame
// does 0. Reason 0 is right, and each turn trains Skill 20.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ANSWERS = ["Give the cause, the new date and the risk.", "Say the server team was slow.", "Say it will be ready soon."];
const RIGHT = "A clear cause and date let the client plan.";
const WRONG = "Blame protects the team.";

/**
 * One normal Battle yesterday. The learner knows how a Battle works, and this week has no
 * Meeting yet, so today is a Meeting day on any weekday (the week rule, battle-week.ts).
 */
async function battledYesterday(email: string) {
  await sql(
    local,
    `with u as (select id from auth.users where email = $1)
     insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
                                     turn_number, move_id, damage, best_move, battle_kind)
     select id, gen_random_uuid(), gen_random_uuid(), now() - interval '1 day', gen_random_uuid(), 't99-sale-day',
            '0123456789abcdef', 1, 'cache.ttl', 2, true, 'battle' from u`,
    [email],
  );
}

/** Design 9 rule 2: the panel takes at most half the screen and never covers a portrait or an HP box. */
async function expectPanelBelowThePortraits(page: Page) {
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

test("a Meeting Battle: framed portraits in an office, full answer lines, Doubt and Trust, kind and Skills logged", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const user = await signInNewUser(page, "meeting");
  try {
    // Caught today, so today has no catch and no review: the Battle of the day comes first.
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await battledYesterday(user.email);
    await page.reload();
    await page.getByRole("button", { name: "15 minutes" }).click();

    // The meeting starts with the person, in a frame. You play alone: no team to pick.
    await expect(page.getByRole("heading", { name: "A meeting begins: Late launch" })).toBeFocused();
    await expect(page.getByText("With: Client")).toBeVisible();
    await expect(page.locator(".portrait-frame img[src$='/portrait-11.png']")).toBeVisible();
    await expect(page.getByText("The client asks why the sale page is late.")).toBeVisible();
    await expect(page.getByText("Doubt 4 of 4")).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Start the meeting" }).click();

    // An office scene. The client and You are framed portraits, not creatures on pads.
    const scene = page.getByRole("region", { name: "Meeting Battle: Late launch" });
    await expect(scene).toBeInViewport({ ratio: 1 });
    await expect(scene.locator(".battle-stage-office")).toBeVisible();
    const opponent = page.getByTestId("opponent");
    await expect(opponent.locator(".portrait-frame img")).toHaveAttribute("src", /\/portrait-11\.png$/);
    await expect(page.getByTestId("my-creature").locator(".portrait-frame img")).toHaveAttribute("src", /\/portrait-3\.png$/);
    await expect(scene.locator(".creature-art")).toHaveCount(0);
    await expect(scene.locator(".battle-pad")).toHaveCount(0);
    await expect(page.getByText("Opponent Doubt 4 of 4")).toBeAttached();
    await expect(page.getByText("You Trust 3 of 3")).toBeAttached();
    // Meeting music, not the Battle loop.
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.music)).toBe("meeting");

    // Turn 1: what the client says and the meeting's Constraint, then the answers.
    const panel = battlePanel(page);
    await expect(panel.getByRole("heading", { name: "Turn 1 of 3" })).toBeFocused();
    await panelSettled(page);
    await expect(panel.getByText("The client says")).toBeVisible();
    await expect(panel.getByText("Why is the sale page late?")).toBeVisible();
    await expect(panel.getByText("The client launches on Friday.")).toBeVisible();
    // Each button shows its whole answer line, wrapped, never cut.
    for (const answer of ANSWERS) {
      const button = panel.getByRole("button", { name: answer, exact: true });
      await expect(button).toHaveText(answer);
      const cut = await button.evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
      expect(cut, answer).toBe(false);
      expect(await button.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("normal");
    }
    if (testInfo.project.name === "iphone") await expectPanelBelowThePortraits(page);
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

    // A vague answer: a small hit, and the client pushes back. Trust drops.
    await playMove(page, ANSWERS[2], RIGHT);
    await expect(panel.getByText("Hit · 1 ●○")).toBeVisible();
    await expect(panel.getByText("You chose “Say it will be ready soon.” The client asks again tomorrow.")).toBeVisible();
    await expect(panel.getByText("The client pushes back: −1 Trust.")).toBeVisible();
    await expect(page.getByText("You Trust 2 of 3")).toBeAttached();
    await nextTurn(page);

    // Turn 2: the best answer with a wrong Reason. The hit is 1 weaker, and Trust holds.
    await expect(panel.getByRole("heading", { name: "Turn 2 of 3" })).toBeFocused();
    await panelSettled(page);
    await panel.getByRole("button", { name: ANSWERS[0], exact: true }).click();
    await expect(panel.getByRole("heading", { name: "Why this answer?" })).toBeFocused();
    // The picked answer stays in view while the learner picks the Reason.
    await expect(panel.getByText(`“${ANSWERS[0]}”`)).toBeVisible();
    await panel.getByRole("button", { name: "Back to the moves" }).click();
    await playMove(page, ANSWERS[0], WRONG);
    await expect(panel.getByText(`Wrong Reason. The right one: “${RIGHT}” Your hit lost 1.`)).toBeVisible();
    await expect(panel.getByText("Best answer. No Trust lost.")).toBeVisible();
    await expect(page.getByText("Opponent Doubt 2 of 4")).toBeAttached();
    await nextTurn(page);

    // Turn 3: the best answer and the right Reason. No doubt is left.
    await playMove(page, ANSWERS[0], RIGHT);
    await expect(panel.getByText("Strong hit · 2 ●●")).toBeVisible();
    await expect(panel.getByText("The client has no doubt left!")).toBeVisible();
    await nextTurn(page, true);
    await expect(scene).toHaveCount(0);

    // Each turn row carries the kind and the Skills, fixed at play time.
    await expect
      .poll(() =>
        sql(
          local,
          `select turn_number, move_id, damage, best_move, battle_kind, move_damage, reason_index, reason_correct, hp_lost,
                  skill_ids, constraint_variant
             from battle_turn_events t join auth.users u on u.id = t.user_id
            where u.email = $1 and scenario_id = 't99-late-launch' order by turn_number`,
          [user.email],
        ),
      )
      .toEqual([
        { turn_number: 1, move_id: "answer.vague-0", damage: 1, best_move: false, battle_kind: "meeting", move_damage: 1, reason_index: 0, reason_correct: true, hp_lost: 1, skill_ids: [20], constraint_variant: "main" },
        { turn_number: 2, move_id: "answer.facts-1", damage: 1, best_move: true, battle_kind: "meeting", move_damage: 2, reason_index: 1, reason_correct: false, hp_lost: 0, skill_ids: [20], constraint_variant: "main" },
        { turn_number: 3, move_id: "answer.facts-2", damage: 2, best_move: true, battle_kind: "meeting", move_damage: 2, reason_index: 0, reason_correct: true, hp_lost: 0, skill_ids: [20], constraint_variant: "main" },
      ]);
    await expect
      .poll(() =>
        sql(
          local,
          `select result, turns_used, battle_kind, faints, team from battle_events b join auth.users u on u.id = b.user_id
            where u.email = $1 and scenario_id = 't99-late-launch'`,
          [user.email],
        ),
      )
      .toEqual([{ result: "won", turns_used: 3, battle_kind: "meeting", faints: 0, team: ["you"] }]);
  } finally {
    await user.forget();
  }
});
