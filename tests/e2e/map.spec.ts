import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

test("the map shows 12 towns, marks the learner's town, and a tap shows a town's name and month", async ({ page }) => {
  const user = await signInNewUser(page, "map");
  try {
    await page.getByRole("link", { name: "Map" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
    const towns = page.getByRole("list", { name: "The 12 towns" }).getByRole("button");
    await expect(towns).toHaveCount(12);

    // A new learner is on day 1, so town 1 is theirs and the rest are not open yet.
    // Seam C uses the fixture town as town 1, so its name comes from the fixture.
    await expect(page.getByRole("button", { name: "Town 1 You are here" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Town 1: Fixture Town" })).toBeVisible();
    await expect(page.getByText("Month 1 · your town now")).toBeVisible();

    await page.getByRole("button", { name: "Town 2 Not open yet" }).click();
    await expect(page.getByRole("heading", { name: "Town 2: API design" })).toBeVisible();
    await expect(page.getByText(/^Month 2 · opens \d{1,2} \w{3} \d{4}$/)).toBeVisible();

    // Pixel art: whole-number scaling and no smoothing (design 9).
    const sprites = await page.locator("canvas.pixel-art").evaluateAll((canvases) =>
      canvases.map((canvas) => {
        const c = canvas as HTMLCanvasElement;
        return { rendering: getComputedStyle(c).imageRendering, scale: c.getBoundingClientRect().width / c.width };
      }),
    );
    expect(sprites).toHaveLength(12);
    for (const sprite of sprites) {
      expect(sprite.rendering).toBe("pixelated");
      expect(Number.isInteger(sprite.scale) && sprite.scale >= 2).toBe(true);
    }

    // The labels fit on the smallest iPhone too (375 px wide).
    await page.setViewportSize({ width: 375, height: 667 });
    const overflowing = await towns.evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const box = button.getBoundingClientRect();
          return [...button.querySelectorAll("span")].some((label) => {
            const inner = label.getBoundingClientRect();
            return inner.left < box.left || inner.right > box.right;
          });
        })
        .map((button) => button.textContent),
    );
    expect(overflowing).toEqual([]);

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});

test("a learner whose day 1 was 70 days ago is in town 3", async ({ page }) => {
  const user = await signInNewUser(page, "map-later");
  try {
    await sql(
      local,
      `update profiles set program_start_date = current_date - 70
        where user_id = (select id from auth.users where email = $1)`,
      [user.email],
    );
    await page.goto("/map");
    await expect(page.getByRole("button", { name: "Town 3 You are here" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Town 1 Past" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Town 4 Not open yet" })).toBeVisible();
    // Town 3 has no content, so the learner keeps playing the last town that has some.
    await expect(page.getByText("Its creatures are not ready yet. You keep playing Town 1: Fixture Town.")).toBeVisible();
  } finally {
    await user.forget();
  }
});
