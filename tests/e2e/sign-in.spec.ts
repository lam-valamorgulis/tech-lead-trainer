import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { local } from "../support/e2e";
import { allowEmailIn, forgetEmail, testEmail } from "../support/local-admin";
import { codeFrom, waitForMail } from "../support/mail";

async function askForCode(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("If this email can sign in, we sent it a 6-digit code.")).toBeVisible();
}

test("an allowed email signs in with the 6-digit code from the email", async ({ page }) => {
  const email = testEmail("e2e");
  try {
    await allowEmailIn(local, email);
    await askForCode(page, email);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByLabel("6-digit code").fill(codeFrom(await waitForMail(local.mailUrl, email)));
    await page.getByRole("button", { name: "Sign in" }).click();

    // A new user first sees the if-then plan screen.
    await expect(page.getByRole("heading", { name: "Your if-then plan" })).toBeVisible();
    await page.getByRole("button", { name: "Later" }).click();
    await expect(page.getByText("Today I commit to:")).toBeVisible();

    // The session stays after the app is closed and opened again.
    await page.reload();
    await expect(page.getByText("Today I commit to:")).toBeVisible();
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  } finally {
    await forgetEmail(local, email);
  }
});

test("a wrong code shows a clear message and keeps the person on the code step", async ({ page }) => {
  const email = testEmail("e2e-wrong");
  try {
    await allowEmailIn(local, email);
    await askForCode(page, email);
    const code = codeFrom(await waitForMail(local.mailUrl, email));

    await page.getByLabel("6-digit code").fill(code === "000000" ? "111111" : "000000");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "This code did not work. Check it, or ask for a new code." }),
    ).toBeVisible();
    await expect(page.getByLabel("6-digit code")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send a new code" })).toBeVisible();
  } finally {
    await forgetEmail(local, email);
  }
});
