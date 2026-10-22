import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C for ticket #110: the Trainer Card in Tracking, on the fixture town (t99, town 1).
// Sprint 7 does not have the v2 Battle screen yet (#103 is in Sprint 6), so the screen still logs
// v1 turns with no Skills. The fixture Battle's 3 turns are seeded as the v2 screen logs them.

/**
 * One finished fixture Battle (t99-sale-day, v1.5 turns): turn 1 trains Skill 3, turn 2 Skills 3
 * and 10, turn 3 Skill 2. The best move is picked on turns 1 and 3. Then one Decision Card
 * (cache.decision.logo, Skill 3) with the right option and the right Reason.
 */
async function playedFixtureBattle(email: string) {
  const turns: [number, string, number, boolean, number[]][] = [
    [1, "cache.ttl", 2, true, [3]],
    [2, "cache.ttl", 0, false, [3, 10]],
    [3, "proxy.cdn", 2, true, [2]],
  ];
  const battleId = crypto.randomUUID();
  for (const [turnNumber, moveId, damage, bestMove, skillIds] of turns) {
    await sql(
      local,
      `insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
         turn_number, move_id, damage, best_move, battle_kind, move_damage, reason_index, reason_correct, hp_lost,
         skill_ids, constraint_variant)
       select id, gen_random_uuid(), gen_random_uuid(), now(), $7::uuid, 't99-sale-day',
         '0123456789abcdef', $2, $3, $4, $5, 'battle', $4, 0, true, case when $5 then 0 else 2 end, $6::smallint[], 'main'
       from auth.users where email = $1`,
      [email, turnNumber, moveId, damage, bestMove, skillIds, battleId],
    );
  }
  await sql(
    local,
    `insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
       choice_index, choice_correct, reason_index, reason_correct, skill_ids, shown_at, graded_at, rules_version)
     select id, gen_random_uuid(), gen_random_uuid(), now(), 'cache.decision.logo', 'decision', '0123456789abcdef',
       0, true, 0, true, array[3]::smallint[], now(), now(), 'v1.5'
     from auth.users where email = $1`,
    [email],
  );
}

test("the Trainer Card shows the 26 Skills, grey until met, and a rate for each Skill of a fixture Battle", async ({ page }) => {
  const user = await signInNewUser(page, "trainer-card");
  try {
    await page.goto("/tracking");
    const tracking = page.locator("main").filter({ has: page.getByRole("heading", { level: 1, name: "Tracking" }) });
    await expect(tracking.getByText("Skills met: 0 of 26")).toBeVisible();
    await tracking.getByRole("link", { name: "Open your Trainer Card" }).click();

    const screen = page.locator("main").filter({ has: page.getByRole("heading", { level: 1, name: "Trainer Card" }) });
    await expect(screen.getByText("Skills met: 0 of 26")).toBeVisible();
    const skills = screen.getByRole("list", { name: "Skills" }).getByRole("listitem");
    await expect(skills).toHaveCount(26);
    // A Skill never met is grey and says so in words, not in colour only.
    await expect(skills.filter({ hasText: "Not met yet" })).toHaveCount(26);
    await expect(skills.first()).toHaveText("1. Technical vision for the teamNot met yet");

    await playedFixtureBattle(user.email);
    await page.reload();
    await expect(screen.getByText("Skills met: 3 of 26")).toBeVisible();
    await expect(skills.nth(1)).toHaveText("2. System and architecture design1 of 1 right · 100%");
    await expect(skills.nth(2)).toHaveText("3. Technical decisions and trade-offs2 of 3 right · 67%");
    await expect(skills.nth(9)).toHaveText("10. Production ownership and incident handling0 of 1 right · 0%");
    await expect(skills.filter({ hasText: "Not met yet" })).toHaveCount(23);
    await expect(skills.nth(0)).toHaveClass(/skill-not-met/);
    await expect(skills.nth(2)).not.toHaveClass(/skill-not-met/);
    // The styles really apply: a Skill never met has a dashed edge, one met a solid edge, and the list has no markers.
    await expect(skills.nth(0)).toHaveCSS("border-top-style", "dashed");
    await expect(skills.nth(2)).toHaveCSS("border-top-style", "solid");
    await expect(screen.getByRole("list", { name: "Skills" })).toHaveCSS("list-style-type", "none");
    await expect(screen.locator(".portrait-frame")).toHaveCSS("border-top-style", "solid");

    // The learner's portrait: the 64 px picture drawn at 96 px, sharp, inside its frame.
    const portrait = screen.locator(".portrait-frame img");
    await expect(portrait).toHaveAttribute("src", "/sprites/portraits/portrait-3.png");
    expect(await portrait.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(64);
    // No XP and no level (design 2).
    await expect(screen).not.toContainText(/\bXP\b|\blevel\b/i);

    // The smallest iPhone the app supports: nothing wider than the screen.
    await page.setViewportSize({ width: 375, height: 667 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await screen.getByRole("link", { name: "Back" }).click();
    await expect(tracking.getByText("Skills met: 3 of 26")).toBeVisible();
  } finally {
    await user.forget();
  }
});
