import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// #95, design 9 rule 15: a Feedback button on every screen saves a note with the screen's name.

const notesOf = (email: string) =>
  sql<{ screen: string; message: string; status: string }>(
    local,
    "select f.screen, f.message, f.status from feedback f join auth.users u on u.id = f.user_id where u.email = $1 order by f.id",
    [email],
  );

async function sendNote(page: Page, text: string) {
  await page.getByRole("button", { name: "Feedback" }).click();
  await page.getByLabel("What should change on this screen?").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thanks. Your note is saved.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
}

test("the Feedback button is on home, session, map, Field Guide, settings and weekend, at least 44 px", async ({ page }) => {
  const user = await signInNewUser(page, "feedback-everywhere");
  try {
    const expectButton = async () => {
      const box = (await page.getByRole("button", { name: "Feedback" }).boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    };
    await expectButton();
    for (const path of ["/map", "/field-guide", "/settings"]) {
      await page.goto(path);
      await expectButton();
    }
    // The weekend page opens the learner's own town.
    await page.goto("/weekend");
    await page.waitForURL(/\/weekend\/t\d{2}$/);
    await expectButton();
    await page.goto("/");
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Active time")).toBeVisible();
    await expectButton();
  } finally {
    await user.forget();
  }
});

test("a note from home and one from the session are saved with their screen names", async ({ page }) => {
  const user = await signInNewUser(page, "feedback-send");
  try {
    await page.getByRole("button", { name: "Feedback" }).click();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("button", { name: "Cancel" }).click();

    await sendNote(page, "The commit buttons are too far down.");
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Active time")).toBeVisible();
    await sendNote(page, "The timer jumps.");

    await expect
      .poll(() => notesOf(user.email))
      .toEqual([
        { screen: "home", message: "The commit buttons are too far down.", status: "open" },
        { screen: "session", message: "The timer jumps.", status: "open" },
      ]);
  } finally {
    await user.forget();
  }
});

test("a failed send shows a clear error and keeps the text", async ({ page }) => {
  const user = await signInNewUser(page, "feedback-offline");
  try {
    await page.route("**/rest/v1/feedback**", (route) => route.abort("internetdisconnected"));
    await page.getByRole("button", { name: "Feedback" }).click();
    const box = page.getByLabel("What should change on this screen?");
    await box.fill("The map is hard to read.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "We could not send your note." })).toBeVisible();
    await expect(box).toHaveValue("The map is hard to read.");

    // Back online: the same text goes through.
    await page.unroute("**/rest/v1/feedback**");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Thanks. Your note is saved.")).toBeVisible();
    await expect.poll(() => notesOf(user.email)).toEqual([{ screen: "home", message: "The map is hard to read.", status: "open" }]);
  } finally {
    await user.forget();
  }
});
