import { expect, type Page } from "@playwright/test";
import { readLocalSupabase } from "../../scripts/local-supabase.mjs";
import { allowEmailIn, forgetEmail, testEmail } from "./local-admin";
import { codeFrom, waitForMail } from "./mail";

export const local = readLocalSupabase();

/** Signs a new allowed email in through the real screens, with the code from local email. */
export async function signInNewUser(page: Page, label: string): Promise<{ email: string; forget: () => Promise<void> }> {
  const email = testEmail(label);
  await allowEmailIn(local, email);
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill(codeFrom(await waitForMail(local.mailUrl, email)));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  return { email, forget: () => forgetEmail(local, email) };
}
