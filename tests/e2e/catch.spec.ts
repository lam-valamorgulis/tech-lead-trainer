import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

// Seam C runs on the fixture town (NEXT_PUBLIC_CONTENT_SET=fixture). Its first creature is Cache.

test("commit 15 minutes, catch one creature, and see it in the Field Guide", async ({ page }) => {
  const user = await signInNewUser(page, "catch");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByRole("heading", { name: "A new creature appears" })).toBeVisible();
    // The question comes before the card.
    await expect(page.getByText("A cache keeps a copy of a response.")).toBeHidden();

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    // A wrong first answer is allowed, and feedback follows.
    await page.getByLabel("To make it smaller").check();
    await page.getByLabel("Guess").check();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: "Not yet" })).toBeFocused();

    await page.getByRole("button", { name: "Read the card" }).click();
    await expect(page.getByText("A cache keeps a copy of a response.")).toBeVisible();
    await expect(page.getByText("Your browser shows the shop logo from its cache on the second visit.")).toBeVisible();
    const source = page.getByRole("link", { name: /Source: MDN: HTTP caching/ });
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("href", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching");

    await page.getByRole("button", { name: "Try the question again" }).click();
    await page.getByLabel("To load it faster next time").check();
    await page.getByLabel("Sure").check();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: "You caught Cache!" })).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Back home" }).click();

    await page.getByRole("link", { name: "Field Guide" }).click();
    const cache = page.getByRole("listitem").filter({ hasText: "Cache" });
    await expect(cache).toContainText("Caught · stage 1");
    await expect(page.getByText("Fixture Town: 1 of 2 caught")).toBeVisible();

    // One new item per day: a second session today offers no catch.
    await page.getByRole("link", { name: "Back" }).click();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a 3-minute day offers no catch", async ({ page }) => {
  const user = await signInNewUser(page, "catch-3");
  try {
    await page.getByRole("button", { name: "3 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "A new creature appears" })).toHaveCount(0);
  } finally {
    await user.forget();
  }
});

test("a session with a catch can still finish early", async ({ page }) => {
  const user = await signInNewUser(page, "catch-early");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByRole("heading", { name: "A new creature appears" })).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("heading", { name: "Session saved" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a catch made offline still counts as today's catch", async ({ page }) => {
  const user = await signInNewUser(page, "catch-offline");
  try {
    await page.route("**/api/events", (route) => route.fulfill({ status: 503, body: "{}" }));
    await page.getByRole("button", { name: "15 minutes" }).click();
    await page.getByLabel("To load it faster next time").check();
    await page.getByLabel("Sure").check();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: "You caught Cache!" })).toBeVisible();
    await page.getByRole("button", { name: "Read the card" }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Back home" }).click();

    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});
