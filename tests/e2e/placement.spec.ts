import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

// Seam C uses the fixture town: 2 placement questions, Cache and Cookie.

test("the placement test before a town catches what the learner already knows", async ({ page }) => {
  const user = await signInNewUser(page, "placement");
  try {
    await page.getByRole("link", { name: "Take the placement test" }).click();
    await expect(page).toHaveURL(/\/placement\/t99$/);
    await expect(page.getByRole("heading", { name: "Question 1 of 2" })).toBeVisible();
    await expect(page.getByText("What does a cache keep?")).toBeVisible();

    await page.getByLabel("Your answer").fill("A copy of the response");
    await page.getByLabel("Think so").check();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText("A copy of a response.")).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("button", { name: "Yes, I knew it" }).click();
    await expect(page.getByText("You caught Cache at stage 1.")).toBeVisible();
    await page.getByRole("button", { name: "Next question" }).click();

    await expect(page.getByRole("heading", { name: "Question 2 of 2" })).toBeVisible();
    await page.getByLabel("Your answer").fill("I am not sure");
    await page.getByLabel("Guess").check();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Not yet" }).click();
    await expect(page.getByText("That is fine. You will learn it in this town.")).toBeVisible();
    await page.getByRole("button", { name: "See your result" }).click();

    await expect(page.getByText("You knew 1 of 2.")).toBeVisible();
    await expect(page.getByText(/Low scores are normal/)).toBeVisible();
    await page.getByRole("link", { name: "Back home" }).click();

    await expect(page.getByRole("link", { name: "Take the placement test" })).toHaveCount(0);
    await page.getByRole("link", { name: "Field Guide" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Cache" })).toContainText("Caught · stage 1");
  } finally {
    await user.forget();
  }
});
