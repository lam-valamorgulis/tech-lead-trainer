import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

test("on the first open the learner writes an if-then plan, and the commit screen shows it", async ({ page }) => {
  const user = await signInNewUser(page, "plan", { keepPlanScreen: true });
  try {
    await expect(page.getByLabel("If I am tired")).toHaveValue("If I am tired, I tap 3.");
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByLabel("After …").fill("my morning coffee");
    await page.getByRole("button", { name: "Save my plan" }).click();

    await expect(page.getByText("After my morning coffee, I open the app and tap 3 / 15 / 45.")).toBeVisible();
    await expect(page.getByText("If I am tired, I tap 3.")).toBeVisible();
    // The plan sits above the three buttons, and the buttons stay in the lower half, on screen.
    const viewport = page.viewportSize()!;
    for (const name of ["3 minutes", "15 minutes", "45 minutes"]) {
      const box = (await page.getByRole("button", { name }).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(viewport.height / 2);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }

    // The plan is saved: it is there after the app opens again.
    await page.reload();
    await expect(page.getByText("After my morning coffee, I open the app and tap 3 / 15 / 45.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("Settings can change both plans and suggests one reminder time for 12 weeks", async ({ page }) => {
  const user = await signInNewUser(page, "plan-settings");
  try {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByText(/same reminder time for your first 12 weeks/)).toBeVisible();
    await expect(page.getByLabel("Morning reminder")).toHaveValue("07:30");

    await page.getByLabel("After …").fill("I park my bike");
    await page.getByLabel("If I am tired").fill("If I am tired, I tap 3 and go to bed.");
    await page.getByRole("button", { name: "Save plans" }).click();
    await expect(page.getByText("Your plans are saved.")).toBeVisible();

    await page.getByRole("link", { name: "Back" }).click();
    await expect(page.getByText("After I park my bike, I open the app and tap 3 / 15 / 45.")).toBeVisible();
    await expect(page.getByText("If I am tired, I tap 3 and go to bed.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a long plan never pushes the commit buttons off the screen", async ({ page }) => {
  const user = await signInNewUser(page, "plan-long", { keepPlanScreen: true });
  try {
    await page.getByLabel("After …").fill(`I ${"walk the dog around the lake ".repeat(7)}`.slice(0, 200));
    await page.getByLabel("If I am tired").fill(`If I am tired, ${"I still tap 3 and rest ".repeat(9)}`.slice(0, 200));
    await page.getByRole("button", { name: "Save my plan" }).click();
    await expect(page.getByText("Today I commit to:")).toBeVisible();

    const viewport = page.viewportSize()!;
    for (const name of ["3 minutes", "15 minutes", "45 minutes"]) {
      const box = (await page.getByRole("button", { name }).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(viewport.height / 2);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  } finally {
    await user.forget();
  }
});
