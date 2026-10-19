import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { readLocalSupabase } from "../../scripts/local-supabase.mjs";
import { codeFrom, waitForMail } from "../support/mail";

const local = readLocalSupabase();
const admin = createClient(local.url, local.secretKey, { auth: { persistSession: false } });

test("an allowed email signs in with the 6-digit code from the email", async ({ page }) => {
  const email = `e2e-${crypto.randomUUID()}@example.test`;
  await admin.from("allowed_emails").insert({ email });

  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("If this email can sign in, we sent it a 6-digit code.")).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);

  const code = codeFrom(await waitForMail(local.mailUrl, email));
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByText(/Day 1 of your program:/)).toBeVisible();

  // The session stays after the app is closed and opened again.
  await page.reload();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
});

test("a wrong code shows a clear message and keeps the person on the code step", async ({ page }) => {
  const email = `e2e-wrong-${crypto.randomUUID()}@example.test`;
  await admin.from("allowed_emails").insert({ email });

  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = codeFrom(await waitForMail(local.mailUrl, email));
  const wrong = code === "000000" ? "111111" : "000000";

  await page.getByLabel("6-digit code").fill(wrong);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "This code did not work. Check it, or ask for a new code." }),
  ).toBeVisible();
  await expect(page.getByLabel("6-digit code")).toBeVisible();

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
});
