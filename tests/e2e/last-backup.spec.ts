import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { findUserId, sql } from "../support/local-admin";

// "Last backup: <date>" in Settings (ticket #22). The weekly job adds a backups row only
// after the file is stored. These tests add the rows by hand, for this learner only.

const DAY = 24 * 60 * 60 * 1000;
const WARNING = "This is more than a week old. The weekly backup may be failing.";

function homeDay(at: Date) {
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Deleting the account at the end deletes these rows too. */
async function addBackup(userId: string, at: Date): Promise<void> {
  const fileName = `backup-${at.toISOString().slice(0, 10)}T${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}Z.tltb`;
  await sql(local, "insert into public.backups (user_id, file_name, finished_at) values ($1, $2, $3)", [
    userId,
    fileName,
    at.toISOString(),
  ]);
}

async function lastBackupLine(page: Page) {
  await page.goto("/settings");
  return page.getByText(/^Last backup:/);
}

test("Settings shows the date of the newest backup, and none yet before the first one", async ({ page }) => {
  const user = await signInNewUser(page, "last-backup");
  try {
    await expect(await lastBackupLine(page)).toHaveText("Last backup: none yet");

    const userId = (await findUserId(local, user.email))!;
    const at = new Date(Date.now() - 2 * DAY);
    await addBackup(userId, new Date(at.getTime() - 7 * DAY));
    await addBackup(userId, at);

    await expect(await lastBackupLine(page)).toHaveText(`Last backup: ${homeDay(at)}`);
    await expect(page.getByText(WARNING)).toHaveCount(0);
  } finally {
    await user.forget();
  }
});

test("when the weekly backup stops, the old date stays and Settings warns", async ({ page }) => {
  const user = await signInNewUser(page, "last-backup-old");
  try {
    const userId = (await findUserId(local, user.email))!;
    const at = new Date(Date.now() - 10 * DAY);
    await addBackup(userId, at);

    await expect(await lastBackupLine(page)).toHaveText(`Last backup: ${homeDay(at)}`);
    await expect(page.getByText(WARNING)).toBeVisible();
  } finally {
    await user.forget();
  }
});
