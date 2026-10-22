import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C uses the fixture glossary: "response" and "logo". The last Cache Lesson screen says "A cache keeps a copy of a response".

test("a tap on a hard word shows its simple definition, and the keyboard opens it too", async ({ page }) => {
  const user = await signInNewUser(page, "glossary");
  try {
    await openCacheLesson(page);

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

/** The last Lesson screen of Cache, which says "A cache keeps a copy of a response". */
async function openCacheLesson(page: Page) {
  await page.getByRole("button", { name: "15 minutes" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("button", { name: "I am ready: catch it" })).toBeVisible();
}

test("without popover support (before iOS 17), a tap shows the definition under the text", async ({ page }) => {
  await page.addInitScript(() => {
    delete (HTMLElement.prototype as { popover?: unknown }).popover;
  });
  const user = await signInNewUser(page, "glossary-old-ios");
  try {
    await openCacheLesson(page);
    const word = page.getByRole("button", { name: "response", exact: true });
    const definition = page.getByText("The message a server sends back to a request.");
    await expect(word).not.toHaveAttribute("popovertarget");
    await expect(definition).toBeHidden();
    await word.click();
    await expect(word).toHaveAttribute("aria-expanded", "true");
    await expect(definition).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(definition).toBeHidden();
  } finally {
    await user.forget();
  }
});

test("battle text has tappable words too: the worked example and the threat", async ({ page }) => {
  const user = await signInNewUser(page, "glossary-battle");
  try {
    for (const itemId of ["cache", "cookie", "proxy"]) {
      await sql(
        local,
        `with u as (select id from auth.users where email = $1)
         insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                   answer_text, correct, confidence, phase)
         select id, gen_random_uuid(), gen_random_uuid(), now(), $2, 'creature', '0123456789abcdef', 'seed', true, 3,
                'before-card' from u`,
        [user.email, itemId],
      );
    }
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByRole("heading", { name: "Worked example: Cache" })).toBeVisible();
    await expect(page.getByRole("button", { name: "logo", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next example" }).click();
    await page.getByRole("button", { name: "Go to the battle" }).click();
    for (const creature of ["Cache", "Cookie", "Proxy"]) await page.getByLabel(creature).check();
    await page.getByRole("button", { name: "Start the battle" }).click();

    // The threat: "Every visitor downloads the same logo and styles again." The Constraint has "logo" too.
    await page.getByTestId("battle-panel").getByRole("button", { name: "logo", exact: true }).first().click();
    // Each "logo" has its own definition box; the one of the threat is first.
    await expect(page.getByText("The small picture that shows the name of a shop.").first()).toBeVisible();
  } finally {
    await user.forget();
  }
});
