import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Ticket #111: the drawn pixel map. Each town is a link to its page.

const townLinks = (page: Page) => page.getByRole("list", { name: "The 12 towns" }).getByRole("link");

async function moveStartDate(email: string, daysAgo: number) {
  await sql(
    local,
    `update profiles set program_start_date = current_date - ${daysAgo}
      where user_id = (select id from auth.users where email = $1)`,
    [email],
  );
}

test("the map shows 12 towns with a road, marks the learner's town, and a tap on Town 1 opens its page", async ({ page }) => {
  const user = await signInNewUser(page, "map");
  try {
    await page.getByRole("link", { name: "Map" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
    await expect(townLinks(page)).toHaveCount(12);
    // The drawn map: a picture with the road under the towns.
    await expect(page.locator(".town-board svg.map-art rect").first()).toBeAttached();

    // A new learner is on day 1, so town 1 is theirs and the rest are not open yet.
    const town1 = page.getByRole("link", { name: "Town 1 You are here" });
    await expect(town1).toHaveAttribute("aria-current", "location");
    await expect(page.locator(".town-pin")).toHaveCount(1);
    for (const number of [2, 7, 12]) {
      const locked = page.getByRole("link", { name: `Town ${number} Not open yet` });
      await expect(locked).toBeVisible();
      // Colour plus icon plus word (UI rule 7): the padlock is there, next to the words.
      await expect(locked.locator("svg.state-icon-locked")).toBeAttached();
    }
    await expect(town1.locator("svg.state-icon-current")).toBeAttached();

    // UI rule 9: every town is a tap target of at least 44 x 44 px, and no two towns overlap.
    const boxes = await townLinks(page).evaluateAll((links) =>
      links.map((link) => {
        const box = link.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      }),
    );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `town ${i + 1} and town ${j + 1} overlap`).toBe(false);
      }
    }

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

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    // Seam C uses the fixture town as town 1, so its name comes from the fixture.
    await town1.click();
    // The dev server builds the town page on its first visit, which can take a few seconds.
    await expect(page).toHaveURL(/\/map\/1$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Town 1" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Fixture Town" })).toBeVisible();
    await expect(page.getByText("Month 1 · your town now")).toBeVisible();
    const links = page.getByRole("navigation", { name: "Town 1" }).getByRole("link");
    // The fixture town 1 has no Town Intro (#98), and its Gym opens in its last week.
    await expect(links).toHaveText(["Field Guide", "Weekend boss"]);
    await expect(page.getByRole("link", { name: "Weekend boss" })).toHaveAttribute("href", "/weekend/t99");
    await expect(page.getByText("No badge yet. Win 4 of the 5 battles in the Gym to earn it.")).toBeVisible();
    const pageCheck = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(pageCheck.violations).toEqual([]);

    await page.getByRole("link", { name: "Field Guide" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Field Guide" })).toBeVisible({ timeout: 15_000 });
  } finally {
    await user.forget();
  }
});

test("the labels fit inside their towns on the smallest iPhone, and a locked town opens nothing", async ({ page }) => {
  const user = await signInNewUser(page, "map-small");
  try {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/map");
    await expect(townLinks(page)).toHaveCount(12);
    const overflowing = await townLinks(page).evaluateAll((links) =>
      links
        .filter((link) => {
          const box = link.getBoundingClientRect();
          return [...link.querySelectorAll("span, svg")].some((part) => {
            const inner = part.getBoundingClientRect();
            return inner.left < box.left || inner.right > box.right || inner.bottom > box.bottom;
          });
        })
        .map((link) => link.textContent),
    );
    expect(overflowing).toEqual([]);
    // UI rule 9 holds on the smallest iPhone too.
    for (const box of await townLinks(page).evaluateAll((links) => links.map((link) => link.getBoundingClientRect().toJSON()))) {
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
    // The map never makes the page scroll sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // Town 3 has no content, so its name comes from the year plan.
    await page.getByRole("link", { name: "Town 3 Not open yet" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Databases, SQL, indexes and transactions" })).toBeVisible();
    // The map stays in the page, hidden, so look only at the town page's state line.
    const stateLine = page.locator("p.town-state-line");
    await expect(stateLine).toHaveText("Not open yet");
    await expect(stateLine.locator("svg.state-icon-locked")).toBeAttached();
    await expect(page.getByText(/^Month 3 · opens \d{1,2} \w{3} \d{4}$/)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Town 3" })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to the map" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a learner whose day 1 was 70 days ago is in town 3, and a past town keeps its links", async ({ page }) => {
  const user = await signInNewUser(page, "map-later");
  try {
    await moveStartDate(user.email, 70);
    await page.goto("/map");
    await expect(page.getByRole("link", { name: "Town 3 You are here" })).toHaveAttribute("aria-current", "location");
    await expect(page.getByRole("link", { name: "Town 1 Past" }).locator("svg.state-icon-past")).toBeAttached();
    await expect(page.getByRole("link", { name: "Town 4 Not open yet" })).toBeVisible();

    // Town 3 has no content, so the learner keeps playing the last town that has some.
    await page.getByRole("link", { name: "Town 3 You are here" }).click();
    await expect(page.getByText("Its creatures are not ready yet. You keep playing Town 2: Fixture Town Two.")).toBeVisible();

    await page.goto("/map/2");
    // Town 2 is played now, so its page opens the Field Guide; its Gym is open since its last week.
    await expect(page.getByRole("navigation", { name: "Town 2" }).getByRole("link")).toHaveText([
      "Town Intro",
      "Field Guide",
      "Enter the Gym",
    ]);
    await page.goto("/map/1");
    await expect(page.getByText("Month 1 · past")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Town 1" }).getByRole("link")).toHaveText(["Weekend boss", "Enter the Gym"]);
  } finally {
    await user.forget();
  }
});

test("the current town's pin moves, and stands still with reduced motion or Reduce effects", async ({ page }) => {
  const user = await signInNewUser(page, "map-motion");
  try {
    await page.goto("/map");
    const pin = page.locator(".town-pin");
    await expect(pin).toBeVisible();
    const animation = () => pin.evaluate((element) => getComputedStyle(element).animationName);
    expect(await animation()).toBe("town-pin-bob");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await animation()).toBe("none");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await sql(local, "update profiles set reduce_effects = true where user_id = (select id from auth.users where email = $1)", [user.email]);
    await page.reload();
    await expect(pin).toBeVisible();
    await expect.poll(animation).toBe("none");
  } finally {
    await user.forget();
  }
});

test("an address that is not one of the 12 towns says so", async ({ page }) => {
  const user = await signInNewUser(page, "map-wrong");
  try {
    await page.goto("/map/13");
    await expect(page.getByText("There is no town at this address. The map has towns 1 to 12.")).toBeVisible();
  } finally {
    await user.forget();
  }
});
