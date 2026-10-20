import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

// Seam C uses the fixture glossary: "response". The Cache card says "A cache keeps a copy of a response."

test("a tap on a hard word shows its simple definition, and the keyboard opens it too", async ({ page }) => {
  const user = await signInNewUser(page, "glossary");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await page.getByLabel("To make it smaller").check();
    await page.getByLabel("Guess").check();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Read the card" }).click();

    const word = page.getByRole("button", { name: "response", exact: true });
    const definition = page.getByText("The message a server sends back to a request.");
    await expect(definition).toBeHidden();

    await word.click();
    await expect(definition).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(definition).toBeHidden();

    await word.focus();
    await page.keyboard.press("Enter");
    await expect(definition).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(definition).toBeHidden();
  } finally {
    await user.forget();
  }
});
