import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { catchItems } from "../support/battle";
import { sql } from "../support/local-admin";

test("the Field Guide lists the creatures of town 1 and hides the ones not met yet", async ({ page }) => {
  const user = await signInNewUser(page, "guide");
  try {
    await page.getByRole("link", { name: "Field Guide" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Field Guide" })).toBeVisible();
    await expect(page.getByText("Fixture Town: 0 of 3 caught")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(3);
    await expect(page.getByRole("listitem").first()).toContainText("???Not met yet");

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});

test("each creature shows as its own sprite: caught in colour, seen in grey, not met as a black shape (#99)", async ({ page }) => {
  const user = await signInNewUser(page, "guide-sprites");
  try {
    // Cache is caught. Cookie was met with a wrong answer. Proxy is not met yet.
    await catchItems(user.email, ["cache"]);
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                 answer_text, correct, confidence, phase)
       select id, gen_random_uuid(), gen_random_uuid(), now(), 'cookie', 'creature', '0123456789abcdef', 'seed', false, 1,
              'before-card' from u`,
      [user.email],
    );
    await page.getByRole("link", { name: "Field Guide" }).click();
    const items = page.getByRole("listitem");
    await expect(items).toHaveCount(3);

    const art = (index: number) => items.nth(index).locator("img.creature-art");
    // The fixture town: Cache is species 12, Cookie 7, Proxy 30.
    await expect(art(0)).toHaveAttribute("src", "/sprites/monsters/monster-12-front.png");
    await expect(art(0)).toHaveClass(/look-color/);
    await expect(items.nth(0)).toContainText("Cache");
    await expect(art(1)).toHaveAttribute("src", "/sprites/monsters/monster-7-front.png");
    await expect(art(1)).toHaveClass(/look-grey/);
    await expect(items.nth(1)).toContainText("Cookie");
    await expect(art(2)).toHaveClass(/look-shadow/);
    await expect(items.nth(2)).toContainText("???");
    await expect(items.nth(2)).not.toContainText("Proxy");

    // 3 per row, each picture drawn at a size that keeps whole pixels sharp, with no smoothing.
    const boxes = await Promise.all([0, 1, 2].map(async (i) => (await items.nth(i).boundingBox())!));
    expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(1);
    expect(await art(0).evaluate((img) => getComputedStyle(img).imageRendering)).toBe("pixelated");
    await expect.poll(() => art(0).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});

test("Credits opens from Settings and names peb and the monster pack", async ({ page }) => {
  const user = await signInNewUser(page, "credits");
  try {
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Credits", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Credits" })).toBeVisible();
    await expect(page.getByText("by peb (pebonius).")).toBeVisible();
    await expect(page.getByRole("link", { name: /64px portraits/ })).toHaveAttribute("href", "https://opengameart.org/content/64px-portraits");
    await expect(page.getByRole("link", { name: /CC-BY 4.0/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /50\+ Monsters Pack 2D/ })).toHaveAttribute(
      "href",
      "https://opengameart.org/content/50-monsters-pack-2d",
    );
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});
