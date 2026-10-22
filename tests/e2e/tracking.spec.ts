import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C for ticket #30: the tracking screen and the Later list, on the fixture town (t99, town 1).

/** Today's learning: 11 minutes, a caught Cache, an Again on Cache, one best move, and a passed Gym. */
async function learnedToday(email: string) {
  const forUser = "select id from auth.users where email = $1";
  await sql(
    local,
    `insert into session_events (user_id, client_event_id, session_id, occurred_at, committed_minutes, active_seconds, device)
     select id, gen_random_uuid(), gen_random_uuid(), now(), 15, 659, 'test' from auth.users where email = $1`,
    [email],
  );
  await sql(
    local,
    `insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                               answer_text, correct, confidence, phase)
     select id, gen_random_uuid(), gen_random_uuid(), now(), 'cache', 'creature', '0123456789abcdef', 'seed', true, 3, 'before-card'
     from (${forUser}) u`,
    [email],
  );
  await sql(
    local,
    `insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
       step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at)
     select id, gen_random_uuid(), gen_random_uuid(), now(), 'cache.ttl', 'move', '0123456789abcdef',
       1, 1, 'again', current_date, now(), now(), now()
     from (${forUser}) u`,
    [email],
  );
  await sql(
    local,
    `insert into battle_turn_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id, content_hash,
       turn_number, move_id, damage, best_move, why_text)
     select id, gen_random_uuid(), gen_random_uuid(), now(), gen_random_uuid(), 't99-sale-day', '0123456789abcdef',
       1, 'cache.ttl', 2, true, 'Old prices are fine for a minute.'
     from (${forUser}) u`,
    [email],
  );
  await sql(
    local,
    `insert into gym_events (user_id, client_event_id, session_id, occurred_at, gym_id, town_id, battle_ids, wins, passed)
     select id, gen_random_uuid(), gen_random_uuid(), now(), gen_random_uuid(), 't99',
       array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()], 4, true
     from (${forUser}) u`,
    [email],
  );
}

test("the tracking screen shows every number on one screen, and scrolls cleanly on a small iPhone", async ({ page }) => {
  const user = await signInNewUser(page, "tracking");
  try {
    await learnedToday(user.email);
    await page.reload();
    // The new link keeps the home links on one line, so the commit buttons keep their room.
    await page.setViewportSize({ width: 375, height: 667 });
    const links = page.getByRole("navigation", { name: "More" }).getByRole("link");
    await expect(links).toHaveText(["Map", "Field Guide", "Tracking", "Settings"]);
    const tops = await links.evaluateAll((all) => all.map((link) => link.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
    await page.getByRole("link", { name: "Tracking" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tracking" })).toBeVisible();
    // Next keeps the home screen in the page, hidden, so every check looks inside this screen only.
    const screen = page.locator("main").filter({ has: page.getByRole("heading", { level: 1, name: "Tracking" }) });

    await expect(screen.getByText("Learned 1 of 30 days")).toBeVisible();
    await expect(screen.getByText("This week: 10 min of 5 h 15 min")).toBeVisible();
    const calendar = screen.getByRole("table", { name: "Learning calendar, last 30 days" });
    await expect(calendar.getByRole("cell", { name: /, learned$/ })).toHaveCount(1);
    await expect(calendar.getByRole("cell", { name: /not learned$/ })).toHaveCount(29);

    const fieldGuide = screen.getByRole("list", { name: "Field Guide" });
    await expect(fieldGuide).toHaveText(["Seen: 1", "Caught: 1", "Fully evolved: 0"].join(""));
    await expect(screen.getByRole("list", { name: "Badges" })).toContainText(/Town 1: Fixture Town · \d{1,2} \w{3} \d{4}/);
    await expect(screen.getByText("Town 1: Fixture Town · 100% (1 of 1 turns)")).toBeVisible();
    // The seeded turn is a v1 turn with no Skills logged, so the Trainer Card has met none (#110).
    await expect(screen.getByText("Skills met: 0 of 26")).toBeVisible();
    await expect(screen.getByRole("link", { name: "Open your Trainer Card" })).toHaveAttribute("href", "/tracking/trainer-card");
    await expect(screen.getByRole("list", { name: "Weakest creatures this week" })).toHaveText("Cache");

    const badgesGoal = screen.getByRole("checkbox", { name: "12 badges (1 of 12)" });
    await expect(badgesGoal).toBeDisabled();
    await expect(badgesGoal).not.toBeChecked();
    await expect(screen.getByRole("checkbox", { name: "Interview Tower passed" })).toBeEnabled();
    await expect(screen.getByRole("checkbox", { name: "Champion project done" })).toBeEnabled();
    // A new learner has no finished week yet.
    await expect(screen.getByText("No weekly summary yet.")).toBeVisible();
    await expect(screen.getByRole("heading", { name: "Later" })).toBeVisible();

    // The smallest iPhone the app supports: nothing wider than the screen, nothing on top of anything else.
    await page.setViewportSize({ width: 375, height: 667 });
    const layout = await page.evaluate(() => {
      const main = [...document.querySelectorAll("main")].find((m) => m.querySelector("h1")?.textContent === "Tracking")!;
      const sections = [...main.querySelectorAll("section")].map((section) => section.getBoundingClientRect());
      const overlaps = sections.slice(1).filter((box, i) => box.top < sections[i].bottom).length;
      return { sections: sections.length, overlaps, wide: document.documentElement.scrollWidth > window.innerWidth };
    });
    expect(layout).toEqual({ sections: 9, overlaps: 0, wide: false });

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});

test("year goals are ticked by hand and kept; the Later list adds and removes goals", async ({ page }) => {
  const user = await signInNewUser(page, "tracking-goals");
  try {
    await page.goto("/tracking");
    const tower = page.getByRole("checkbox", { name: "Interview Tower passed" });
    await tower.check();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(tower).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Champion project done" })).not.toBeChecked();
    await tower.uncheck();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(tower).not.toBeChecked();

    const later = page.getByRole("list", { name: "Later list" });
    await expect(page.getByText("Nothing parked yet.")).toBeVisible();
    await page.getByLabel("A new goal for later").fill("Learn Rust");
    await page.getByRole("button", { name: "Park it" }).click();
    await expect(later).toHaveText("Learn RustRemove");
    await expect(page.getByLabel("A new goal for later")).toHaveValue("");
    await page.getByLabel("A new goal for later").fill("Kubernetes course");
    await page.getByRole("button", { name: "Park it" }).click();
    await expect(later.getByRole("listitem")).toHaveCount(2);

    await page.getByRole("button", { name: "Remove Learn Rust" }).click();
    await expect(later.getByRole("listitem")).toHaveCount(1);
    await page.reload();
    await expect(later.getByRole("listitem")).toHaveText(["Kubernetes courseRemove"]);
  } finally {
    await user.forget();
  }
});
