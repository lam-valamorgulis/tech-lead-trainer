import { expect, type Page } from "@playwright/test";
import { readLocalSupabase } from "../../scripts/local-supabase.mjs";
import { allowEmailIn, forgetEmail, testEmail } from "./local-admin";
import { codeFrom, waitForMail } from "./mail";

export const local = readLocalSupabase();

/**
 * Signs a new allowed email in through the real screens, with the code from local email.
 * A new user first sees the if-then plan screen. Unless `keepPlanScreen` is set, it taps "Later".
 */
export async function signInNewUser(
  page: Page,
  label: string,
  { keepPlanScreen = false } = {},
): Promise<{ email: string; forget: () => Promise<void> }> {
  const email = testEmail(label);
  await allowEmailIn(local, email);
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill(codeFrom(await waitForMail(local.mailUrl, email)));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your if-then plan" })).toBeVisible();
  if (!keepPlanScreen) {
    await page.getByRole("button", { name: "Later" }).click();
    await expect(page.getByText("Today I commit to:")).toBeVisible();
  }
  return { email, forget: () => forgetEmail(local, email) };
}
