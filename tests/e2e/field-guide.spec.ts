import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

test("the Field Guide lists the creatures of town 1 and hides the ones not met yet", async ({ page }) => {
  const user = await signInNewUser(page, "guide");
  try {
    await page.getByRole("link", { name: "Field Guide" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Field Guide" })).toBeVisible();
    await expect(page.getByText("Fixture Town: 0 of 2 caught")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("listitem").first()).toContainText("???Not met yet");

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});
