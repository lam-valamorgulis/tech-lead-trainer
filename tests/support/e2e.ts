import { expect, type Page } from "@playwright/test";
import { readLocalSupabase } from "../../scripts/local-supabase.mjs";
import { allowEmailIn, forgetEmail, testEmail } from "./local-admin";
import { codeFrom, waitForMail } from "./mail";

export const local = readLocalSupabase();

/** Words that blame the learner for a break. None may appear on the Rest Stop (design 5). */
export const BLAME = /missed|streak|lost|behind|failed|lazy|should have|broke|gave up|too long/i;

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

/** Reads the Lesson before a catch (#97): taps Next until the question comes. */
export async function readLesson(page: Page): Promise<void> {
  await expect(page.getByText(/^Lesson · /)).toBeVisible();
  const ready = page.getByRole("button", { name: "I am ready: catch it" });
  while (!(await ready.isVisible())) await page.getByRole("button", { name: "Next" }).click();
  await ready.click();
  await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
}
