import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the Field Guide page opens at /field-guide and has no accessibility violations", async ({ page }) => {
  await page.goto("/field-guide");

  await expect(page.getByRole("heading", { level: 1, name: "Field Guide" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back" })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
