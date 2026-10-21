import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// #94, UI rules 13 and 14: the speaker button, the music loops and the silent-mode line.

/** Counts the notes that start. The music makes a new note every few steps, so a count that grows means music. */
async function countNotes(page: Page) {
  await page.addInitScript(() => {
    const log = { notes: 0 };
    (window as unknown as { noteLog: typeof log }).noteLog = log;
    const Real = window.AudioContext;
    if (!Real) return;
    window.AudioContext = class extends Real {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when?: number) => {
          log.notes += 1;
          start(when);
        };
        return oscillator;
      }
    };
  });
}

const notes = (page: Page) => page.evaluate(() => (window as unknown as { noteLog: { notes: number } }).noteLog.notes);

const soundSetting = (email: string) =>
  sql(local, "select sound_on from profiles p join auth.users u on u.id = p.user_id where u.email = $1", [email]);

test("the speaker button is at least 44 px, and it is the same switch as Sound effects in Settings", async ({ page }) => {
  const user = await signInNewUser(page, "speaker-switch");
  try {
    const speaker = page.getByRole("button", { name: "Sound on" });
    await expect(speaker).toHaveAttribute("aria-pressed", "true");
    const box = await speaker.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await speaker.click();
    await expect(page.getByRole("button", { name: "Sound off" })).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => soundSetting(user.email)).toEqual([{ sound_on: false }]);

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByLabel("Sound effects")).not.toBeChecked();
    await page.getByLabel("Sound effects").check();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await page.getByRole("link", { name: "Back" }).click();
    await expect(page.getByRole("button", { name: "Sound on" })).toHaveAttribute("aria-pressed", "true");
  } finally {
    await user.forget();
  }
});

test("the speaker button is on the map too, at least 44 px, and the map loop starts at the first tap there", async ({ page }) => {
  await countNotes(page);
  const user = await signInNewUser(page, "speaker-map");
  try {
    await page.goto("/map");
    const speaker = page.getByRole("button", { name: "Sound on" });
    const box = (await speaker.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    // A fresh page load: the first tap anywhere starts the sound.
    await page.getByRole("heading", { name: "Map" }).click();
    const first = await notes(page);
    await expect.poll(() => notes(page)).toBeGreaterThan(first + 3);
  } finally {
    await user.forget();
  }
});

test("after the commit tap the music plays, and the speaker button mutes it at once", async ({ page }) => {
  await countNotes(page);
  const user = await signInNewUser(page, "speaker-music");
  try {
    await page.getByRole("button", { name: "15 minutes" }).click();
    // The loop keeps adding notes while it plays.
    const first = await notes(page);
    await expect.poll(() => notes(page)).toBeGreaterThan(first + 3);

    await page.getByRole("button", { name: "Sound on" }).click();
    await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();
    // Notes already planned for the next 120 ms may still start, silent. After that, none.
    await page.waitForTimeout(300);
    const muted = await notes(page);
    await page.waitForTimeout(1000);
    expect(await notes(page)).toBe(muted);
  } finally {
    await user.forget();
  }
});

test("the silent-mode line shows once on this device, when the music starts", async ({ page }) => {
  const user = await signInNewUser(page, "speaker-hint");
  try {
    await expect(page.getByText("Turn off silent mode to hear the music")).toBeHidden();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Turn off silent mode to hear the music")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await expect(page.getByText("Active time")).toBeVisible();
    await expect(page.getByText("Turn off silent mode to hear the music")).toBeHidden();
  } finally {
    await user.forget();
  }
});

test("with sound off there is no silent-mode line and no music", async ({ page }) => {
  await countNotes(page);
  const user = await signInNewUser(page, "speaker-off");
  try {
    await page.getByRole("button", { name: "Sound on" }).click();
    await expect.poll(() => soundSetting(user.email)).toEqual([{ sound_on: false }]);
    await page.reload();
    await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();
    await page.getByRole("button", { name: "15 minutes" }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Turn off silent mode to hear the music")).toBeHidden();
    expect(await notes(page)).toBe(0);
  } finally {
    await user.forget();
  }
});

test("the speaker button covers neither the title nor the intro line on home", async ({ page }) => {
  const user = await signInNewUser(page, "speaker-place");
  try {
    const speaker = (await page.getByRole("button", { name: "Sound on" }).boundingBox())!;
    // The text itself, not its full-width box.
    const textBox = (selector: string) =>
      page.evaluate((s) => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(s)!);
        const { left, right, top, bottom } = range.getBoundingClientRect();
        return { left, right, top, bottom };
      }, selector);
    for (const text of [await textBox("h1"), await textBox("[data-testid=home-intro]")]) {
      const apart = text.right <= speaker.x || text.bottom <= speaker.y || text.top >= speaker.y + speaker.height;
      expect(apart).toBe(true);
    }
  } finally {
    await user.forget();
  }
});
