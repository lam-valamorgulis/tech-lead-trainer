import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home screen shows the app name and has no accessibility violations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Tech Lead Trainer" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("home screen fills the screen and keeps sentences readable", async ({ page }) => {
  await page.goto("/");

  const shell = page.getByRole("main");
  const viewport = page.viewportSize()!;
  const shellBox = await shell.boundingBox();
  expect(shellBox!.height).toBeGreaterThanOrEqual(viewport.height);

  const sentence = page.getByTestId("home-intro");
  const fontSize = await sentence.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  expect(fontSize).toBeLessThanOrEqual(17);
});

test("app can be installed to the Home Screen and opens full screen", async ({ page, request }) => {
  await page.goto("/");

  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "Tech Lead Trainer",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest).toMatchObject({
    name: "Tech Lead Trainer",
    short_name: "Tech Lead Trainer",
    display: "standalone",
    start_url: "/",
  });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(icon.src)).status()).toBe(200);
  }
});
