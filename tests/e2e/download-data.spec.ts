import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

async function learnThenOpenSettings(page: Page) {
  await page.getByRole("button", { name: "3 minutes" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("button", { name: "Back home" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
}

function expectDataFile(name: string, text: string) {
  expect(name).toMatch(/^tech-lead-trainer-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(text);
  expect(file.schemaVersion).toBe(1);
  expect(file.events.session_events.length).toBeGreaterThan(0);
  expect(file.daysLearnedLast30.windowDays).toBe(30);
}

test("on a computer, Download my data saves one JSON file", async ({ page, isMobile }) => {
  test.skip(isMobile, "iPhone uses the share sheet; see the next test.");
  const user = await signInNewUser(page, "export");
  try {
    await learnThenOpenSettings(page);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download my data" }).click();
    const download = await downloading;

    expectDataFile(download.suggestedFilename(), await readFile((await download.path())!, "utf8"));
    await expect(page.getByText("Your data file is ready.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("on iPhone, Download my data opens the share sheet with the JSON file, for Save to Files", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Only iPhone uses the share sheet.");
  // A test browser has no share sheet, so this stub keeps what the app shares.
  await page.addInitScript(() => {
    const shared: { name: string; text: string }[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async ({ files }: { files: File[] }) => {
        for (const file of files) shared.push({ name: file.name, text: await file.text() });
      },
    });
  });
  const user = await signInNewUser(page, "export-iphone");
  try {
    await learnThenOpenSettings(page);
    await page.getByRole("button", { name: "Download my data" }).click();
    // The share sheet needs a fresh tap, so it has its own button.
    await page.getByRole("button", { name: "Save to Files" }).click();
    await expect(page.getByText("Your data file is ready.")).toBeVisible();

    const [file] = await page.evaluate(() => (window as unknown as { __shared: { name: string; text: string }[] }).__shared);
    expectDataFile(file.name, file.text);
  } finally {
    await user.forget();
  }
});
