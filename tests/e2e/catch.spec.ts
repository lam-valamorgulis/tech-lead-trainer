import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readLesson, signInNewUser } from "../support/e2e";

// Seam C runs on the fixture town (NEXT_PUBLIC_CONTENT_SET=fixture). Its first creature is Cache.

test("commit 15 minutes, read the 3 Lesson screens, catch with a second try, and see it in the Field Guide", async ({ page }) => {
  const user = await signInNewUser(page, "catch");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    // Design 6.3: teach first. The question waits until the Lesson is read.
    await expect(page.getByRole("heading", { name: "A new creature: Cache" })).toBeVisible();
    await expect(page.getByText("Lesson · Cache · 1 of 3")).toBeVisible();
    await expect(page.getByText("Why does a browser keep a copy of a page?")).toBeHidden();
    // The diagram is drawn from the content's Mermaid text, and a screen reader gets it in words.
    await expect(page.locator(".content-diagram svg")).toBeVisible();
    await expect(page.getByText("Diagram: Browser to Server")).toBeAttached();
    const source = page.getByRole("link", { name: /Source: MDN: HTTP caching/ });
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("href", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching");

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Cache, 2 of 3" })).toBeFocused();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("A cache keeps a copy of a response, so the next visit loads faster.")).toBeVisible();
    await page.getByRole("button", { name: "I am ready: catch it" }).click();

    // A wrong first answer shows the Lesson screen that holds the answer, then one more try.
    await expect(page.getByRole("heading", { name: "Catch Cache" })).toBeFocused();
    await page.getByLabel("To make it smaller").check();
    await page.getByLabel("Guess").check();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: "Not yet. Look again" })).toBeFocused();
    await expect(page.getByText("Look again · Lesson 3 of 3")).toBeVisible();
    await expect(page.getByText("A cache keeps a copy of a response, so the next visit loads faster.")).toBeVisible();
    // The first answer is locked, and says so in words.
    await expect(page.getByLabel("To make it smaller")).toBeDisabled();
    await expect(page.getByText("your first answer, not right")).toBeVisible();

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
    await expect(page.getByText("Fixture Town: 1 of 3 caught")).toBeVisible();

    // One new item per day: a second session today offers no catch.
    await page.getByRole("link", { name: "Back" }).click();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("the Lesson turns with a sideways swipe, and back", async ({ page }) => {
  const user = await signInNewUser(page, "catch-swipe");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Lesson · Cache · 1 of 3")).toBeVisible();
    const swipe = async (dx: number) => {
      const box = (await page.locator(".swipe-area").boundingBox())!;
      const y = box.y + 120;
      await page.mouse.move(box.x + box.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + dx, y + 5, { steps: 5 });
      await page.mouse.up();
    };
    await swipe(-150);
    await expect(page.getByText("Lesson · Cache · 2 of 3")).toBeVisible();
    await swipe(150);
    await expect(page.getByText("Lesson · Cache · 1 of 3")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("two wrong answers end the catch: the item comes back next time", async ({ page }) => {
  const user = await signInNewUser(page, "catch-miss");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await readLesson(page);
    for (const wrong of ["To make it smaller", "To hide it from the server"]) {
      await page.getByLabel(wrong).check();
      await page.getByLabel("Guess").check();
      await page.getByRole("button", { name: "Check" }).click();
    }
    await expect(page.getByRole("heading", { name: "Not this time" })).toBeVisible();
    await expect(page.getByText("The answer is: To load it faster next time.")).toBeVisible();
    await expect(page.getByText("Cache comes back next time.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a 3-minute day offers no catch", async ({ page }) => {
  const user = await signInNewUser(page, "catch-3");
  try {
    await page.getByRole("button", { name: "3 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "A new creature: Cache" })).toHaveCount(0);
  } finally {
    await user.forget();
  }
});

test("a session with a catch can still finish early", async ({ page }) => {
  const user = await signInNewUser(page, "catch-early");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByRole("heading", { name: "A new creature: Cache" })).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByRole("heading", { name: "Session saved" })).toBeVisible();
    await expect(page.getByText("Best moves in Fixture Town: no battle turns yet")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a catch made offline still counts as today's catch", async ({ page }) => {
  const user = await signInNewUser(page, "catch-offline");
  try {
    await page.route("**/api/events", (route) => route.fulfill({ status: 503, body: "{}" }));
    await page.getByRole("button", { name: "15 minutes" }).click();
    await readLesson(page);
    await page.getByLabel("To load it faster next time").check();
    await page.getByLabel("Sure").check();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("heading", { name: "You caught Cache!" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByRole("button", { name: "Back home" }).click();

    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Nothing is due today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("the catch shows the creature's own sprite (#99)", async ({ page }) => {
  const user = await signInNewUser(page, "catch-sprite");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    // The fixture's Cache is species 12, drawn at 2 times its 64 pixels.
    const art = page.locator("img.creature-art");
    await expect(art).toHaveAttribute("src", "/sprites/monsters/monster-12-front.png");
    await expect(art).toHaveAttribute("width", "128");
    await readLesson(page);
    await expect(art).toBeVisible();
  } finally {
    await user.forget();
  }
});
