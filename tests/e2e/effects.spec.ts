import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { catchItems } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// UI rules 9 and 10: short effects that respect reduced motion, and sounds that start in the
// commit tap, can be muted, and always have a text twin.

type SoundLog = { contexts: number; notes: number };

/** Counts audio contexts and played notes. The real Web Audio still runs underneath. */
async function listenForSound(page: Page) {
  await page.addInitScript(() => {
    const log = { contexts: 0, notes: 0 };
    (window as unknown as { soundLog: typeof log }).soundLog = log;
    const Real = window.AudioContext;
    if (!Real) return;
    window.AudioContext = class extends Real {
      constructor(options?: AudioContextOptions) {
        super(options);
        log.contexts += 1;
      }
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

const soundLog = (page: Page) => page.evaluate(() => (window as unknown as { soundLog: SoundLog }).soundLog);

/** The effect names on screen, and how many animations run right now. */
const effectsOnScreen = (page: Page) =>
  page.evaluate(() => ({
    running: document.getAnimations().length,
    effects: [...document.querySelectorAll(".fx")].map((element) => {
      const style = getComputedStyle(element);
      return { name: style.animationName, seconds: parseFloat(style.animationDuration), times: style.animationIterationCount };
    }),
  }));

async function expectNoMovement(page: Page) {
  const { running, effects } = await effectsOnScreen(page);
  expect(effects.length).toBeGreaterThan(0);
  expect({ running, names: effects.map((effect) => effect.name) }).toEqual({ running: 0, names: effects.map(() => "none") });
}

/** Commits 15 minutes and catches Cache with a right first answer. */
async function catchCache(page: Page) {
  await page.getByRole("button", { name: "15 minutes" }).click();
  await page.getByLabel("To load it faster next time").check();
  await page.getByLabel("Sure").check();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("heading", { name: "You caught Cache!" })).toBeVisible();
}

/** Commits 15 minutes and plays the first battle turn with the best move: a strong hit. */
async function strongHit(page: Page, email: string) {
  await catchItems(email, ["cache", "cookie", "proxy"]);
  await page.getByRole("button", { name: "15 minutes" }).click();
  await page.getByRole("button", { name: "Next example" }).click();
  await page.getByRole("button", { name: "Go to the battle" }).click();
  for (const creature of ["Cache", "Proxy", "Cookie"]) await page.getByLabel(creature).check();
  await page.getByRole("button", { name: "Start the battle" }).click();
  await page.getByLabel("TTL (Cache)").check();
  await page.getByLabel("Why this move?").fill("The logo rarely changes.");
  await page.getByRole("button", { name: "Make the move" }).click();
  await expect(page.getByText("Strong hit · 2 ●●")).toBeVisible();
}

/** Cache was caught 11 days ago, then Good on time twice: 1 → 3 → 7. The 7-day step is due today. */
async function sevenDayStepDueToday(email: string) {
  await sql(
    local,
    `with u as (select id from auth.users where email = $1)
     insert into catch_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                               answer_text, correct, confidence, phase)
     select id, gen_random_uuid(), gen_random_uuid(), now() - interval '11 days', 'cache', 'creature',
            '0123456789abcdef', 'To load it faster next time', true, 3, 'before-card' from u`,
    [email],
  );
  for (const [daysAgo, before, after] of [
    [10, 1, 3],
    [7, 3, 7],
  ]) {
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into review_events (user_id, client_event_id, session_id, occurred_at, item_id, item_kind, content_hash,
                                  step_before, step_after, grade, planned_due_day, shown_at, revealed_at, graded_at)
       select id, gen_random_uuid(), gen_random_uuid(), now() - make_interval(days => $2), 'cache', 'creature',
              '0123456789abcdef', $3, $4, 'good', (now() - make_interval(days => $2))::date,
              now() - make_interval(days => $2), now() - make_interval(days => $2), now() - make_interval(days => $2)
         from u`,
      [email, daysAgo, before, after],
    );
  }
}

/** Commits 3 minutes and grades the due review of Cache Good, past its 7-day step. */
async function passSevenDayStep(page: Page) {
  await page.getByRole("button", { name: "3 minutes" }).click();
  await expect(page.getByRole("heading", { name: "Review 1 of 1: Cache" })).toBeVisible();
  await page.getByRole("button", { name: "Reveal" }).click();
  await page.getByRole("button", { name: "Good · 14 days" }).click();
  await expect(page.getByRole("heading", { name: "Cache evolved!" })).toBeFocused();
}

async function openSettings(page: Page) {
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Effects and sound" })).toBeVisible();
}

test("sound starts only in the commit tap, and a strong hit plays next to its text and a short effect", async ({ page }) => {
  await listenForSound(page);
  const user = await signInNewUser(page, "fx-sound");
  try {
    // Sound stays off until the first commit tap.
    expect(await soundLog(page)).toEqual({ contexts: 0, notes: 0 });
    await strongHit(page, user.email);
    expect((await soundLog(page)).contexts).toBe(1);
    await expect.poll(async () => (await soundLog(page)).notes).toBeGreaterThan(0);

    // UI rule 9: each effect plays once and is short.
    const { effects } = await effectsOnScreen(page);
    expect(effects.map((effect) => effect.name).sort()).toEqual(["fx-flash", "fx-pop"]);
    for (const effect of effects) {
      expect(effect.times).toBe("1");
      expect(effect.seconds).toBeLessThanOrEqual(0.5);
    }
    // Nothing waits for the effect: the next button works at once.
    await page.getByRole("button", { name: "See the model answer" }).click();
    await expect(page.getByRole("heading", { name: "Model answer" })).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a catch has a sound and a text twin", async ({ page }) => {
  await listenForSound(page);
  const user = await signInNewUser(page, "fx-catch");
  try {
    await catchCache(page);
    await expect.poll(async () => (await soundLog(page)).notes).toBeGreaterThan(0);
  } finally {
    await user.forget();
  }
});

test("the mute toggle in Settings stops every sound, and the text stays", async ({ page }) => {
  await listenForSound(page);
  const user = await signInNewUser(page, "fx-mute");
  try {
    await openSettings(page);
    const sound = page.getByLabel("Sound effects");
    await expect(sound).toBeChecked();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await sound.uncheck();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Sound effects")).not.toBeChecked();
    await expect
      .poll(() =>
        sql(local, "select sound_on from profiles p join auth.users u on u.id = p.user_id where u.email = $1", [user.email]),
      )
      .toEqual([{ sound_on: false }]);

    await page.getByRole("link", { name: "Back" }).click();
    await catchCache(page);
    expect(await soundLog(page)).toEqual({ contexts: 0, notes: 0 });
  } finally {
    await user.forget();
  }
});

test("the Reduce effects setting removes all movement", async ({ page }) => {
  const user = await signInNewUser(page, "fx-reduce");
  try {
    await openSettings(page);
    await page.getByLabel("Reduce effects").check();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await page.getByRole("link", { name: "Back" }).click();
    await strongHit(page, user.email);
    await expectNoMovement(page);
  } finally {
    await user.forget();
  }
});

test.describe("with reduce motion on in the phone", () => {
  test.use({ reducedMotion: "reduce" });

  test("a strong hit and a catch show no movement, and the text still says what happened", async ({ page }) => {
    const user = await signInNewUser(page, "fx-motion");
    try {
      await strongHit(page, user.email);
      await expect(page.getByText("Opponent HP 2 of 4")).toBeVisible();
      await expectNoMovement(page);
    } finally {
      await user.forget();
    }
  });

  test("the evolution shows no movement either", async ({ page }) => {
    const user = await signInNewUser(page, "fx-motion-evolve");
    try {
      await sevenDayStepDueToday(user.email);
      await passSevenDayStep(page);
      await expect(page.getByText("Stage 2 of 3")).toBeVisible();
      await expectNoMovement(page);
    } finally {
      await user.forget();
    }
  });

  test("the catch shows no movement either", async ({ page }) => {
    const user = await signInNewUser(page, "fx-motion-catch");
    try {
      await catchCache(page);
      await expectNoMovement(page);
    } finally {
      await user.forget();
    }
  });
});

test("passing the 7-day review evolves Cache, with a sound and a text twin", async ({ page }) => {
  await listenForSound(page);
  const user = await signInNewUser(page, "fx-evolve");
  try {
    await sevenDayStepDueToday(user.email);
    await passSevenDayStep(page);
    await expect(page.getByText("Stage 2 of 3")).toBeVisible();
    await expect.poll(async () => (await soundLog(page)).notes).toBeGreaterThan(0);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});
