import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { catchItems } from "../support/battle";
import { signInNewUser } from "../support/e2e";

// Ticket #112: the System Map. Seam C: a caught fixture creature shows at its place.
// The fixture: Cache sits at the cache, Cookie at the browser, Proxy at the CDN. Every creature
// of Fixture Town Two sits at its town's node, the API.

const place = (page: Page, node: string) => page.locator(`[data-node="${node}"]`);
const placeNames = (page: Page) => page.locator(".system-chain .system-place-name");

async function openSystemMap(page: Page) {
  await page.getByRole("link", { name: "Map" }).click();
  await page.getByRole("link", { name: "System Map" }).click();
  // The dev server builds the page on its first visit, which can take a few seconds.
  await expect(page.getByRole("heading", { level: 1, name: "System Map" })).toBeVisible({ timeout: 15_000 });
}

async function boxesOf(locator: Locator) {
  return locator.evaluateAll((parts) => parts.map((part) => part.getBoundingClientRect().toJSON() as DOMRect));
}

const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test("a new learner sees the 6 places of the system as ??? in request order, and an outer ring", async ({ page }) => {
  const user = await signInNewUser(page, "system-map-empty");
  try {
    await openSystemMap(page);
    await expect(page.getByText("Catch a creature to see where it lives in a real web system.")).toBeVisible();
    await expect(placeNames(page)).toHaveText(["???", "???", "???", "???", "???", "???"]);
    await expect(page.locator(".system-place-hidden")).toHaveCount(7);
    await expect(page.locator("img.creature-art")).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("link", { name: "Back to the map" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a caught creature shows as a small sprite at its place, and the place shows its name", async ({ page }) => {
  const user = await signInNewUser(page, "system-map-caught");
  try {
    // Cache (town 1) and Rate limit (town 2) are caught. Proxy only had a caught move, so the CDN stays ???.
    await catchItems(user.email, ["cache", "rate-limit", "proxy.cdn"]);
    await openSystemMap(page);
    await expect(page.getByText("2 caught creatures sit in a real web system. A request goes from the top down.")).toBeVisible();
    await expect(placeNames(page)).toHaveText(["???", "???", "API", "Cache", "???", "???"]);

    const cache = place(page, "cache");
    await expect(cache.getByRole("heading", { level: 2, name: "Cache" })).toBeVisible();
    await expect(cache.getByText("Fast memory for answers you reuse.")).toBeVisible();
    const creatures = cache.getByRole("list", { name: "Creatures at Cache" }).getByRole("listitem");
    await expect(creatures).toHaveText(["Cache"]);
    const sprite = creatures.first().locator("img.creature-art");
    await expect(sprite).toHaveAttribute("src", "/sprites/monsters/monster-12-front.png");
    // A small sprite: 64 px at 1 time, drawn with no smoothing (design 9).
    await expect.poll(() => sprite.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);
    expect((await sprite.boundingBox())!.width).toBe(64);
    expect(await sprite.evaluate((img) => getComputedStyle(img).imageRendering)).toBe("pixelated");

    // A creature of another town sits at its own town's node.
    await expect(place(page, "api").getByRole("list", { name: "Creatures at API" })).toHaveText(["Rate limit"]);
    await expect(place(page, "cdn")).toHaveClass(/system-place-hidden/);
    await expect(place(page, "browser").getByRole("listitem")).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});

test("on the smallest iPhone in portrait, places and sprites do not overlap and the page scrolls", async ({ page }) => {
  const user = await signInNewUser(page, "system-map-small");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy", "rate-limit", "api-key"]);
    await page.setViewportSize({ width: 375, height: 667 });
    await openSystemMap(page);
    await expect(placeNames(page)).toHaveText(["Browser", "CDN", "API", "Cache", "???", "???"]);

    // No two places or links overlap, and no two creatures overlap.
    const spots = await boxesOf(page.locator(".system-place, .system-edge, .system-ring"));
    expect(spots).toHaveLength(12);
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) expect(overlap(spots[i], spots[j]), `spots ${i} and ${j} overlap`).toBe(false);
    }
    const creatures = await boxesOf(page.locator(".system-creature"));
    expect(creatures).toHaveLength(5);
    for (let i = 0; i < creatures.length; i++) {
      for (let j = i + 1; j < creatures.length; j++) expect(overlap(creatures[i], creatures[j]), `creatures ${i} and ${j} overlap`).toBe(false);
    }

    // Each sprite and each name stays inside its place.
    const outside = await page.locator(".system-place, .system-ring").evaluateAll((places) =>
      places.flatMap((spot) => {
        const box = spot.getBoundingClientRect();
        return [...spot.querySelectorAll(".system-creature img, .system-creature-name")]
          .filter((part) => {
            const inner = part.getBoundingClientRect();
            return inner.left < box.left || inner.right > box.right || inner.top < box.top || inner.bottom > box.bottom;
          })
          .map((part) => part.closest(".system-creature")?.textContent);
      }),
    );
    expect(outside).toEqual([]);

    // Portrait: nothing scrolls sideways. The map is taller than the screen, so the page scrolls to its end.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(667);
    const ring = page.locator(".system-ring");
    await ring.scrollIntoViewIfNeeded();
    await expect(ring).toBeInViewport();
  } finally {
    await user.forget();
  }
});
