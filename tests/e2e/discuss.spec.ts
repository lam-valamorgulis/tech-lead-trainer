import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { catchItems, nextTurn, playMove, SALE_DAY_REASONS } from "../support/battle";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// Seam C runs on the fixture town. Its scenario "Sale day" is won with TTL, then No store.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** claude.ai is not part of the test: a new tab gets a small stand-in page. */
async function standInForClaude(page: Page) {
  await page.context().route("https://claude.ai/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>Claude</title>" }),
  );
}

/** Replaces the clipboard: it keeps what the app copies, or refuses like a phone that denies access. */
async function fakeClipboard(page: Page, mode: "keep" | "deny") {
  await page.addInitScript((deny) => {
    const copied: string[] = [];
    (window as unknown as { copied: string[] }).copied = copied;
    const writeText = (text: string) => {
      if (deny) return Promise.reject(new DOMException("Clipboard access denied", "NotAllowedError"));
      copied.push(text);
      return Promise.resolve();
    };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  }, mode === "deny");
}

/**
 * Plays and wins "Sale day": own words on turn 1, only the Reason on turn 2. Then the self-check
 * ticks key points 1 and 3 on turn 1 and none on turn 2.
 */
async function winSaleDay(page: Page) {
  await page.getByRole("button", { name: "15 minutes" }).click();
  // The first battle with Cache and Proxy starts with their two worked examples.
  await page.getByRole("button", { name: "Next example" }).click();
  await page.getByRole("button", { name: "Go to the battle" }).click();
  await expect(page.getByRole("heading", { name: "A battle begins: Sale day" })).toBeVisible();
  for (const creature of ["Cache", "Cookie", "Proxy"]) await page.getByLabel(creature).check();
  await page.getByRole("button", { name: "Start the battle" }).click();

  await playMove(page, "TTL (Cache)", SALE_DAY_REASONS[0].right, "The logo rarely changes, so a copy can live for an hour.");
  await nextTurn(page);
  await playMove(page, "No store (Cache)", SALE_DAY_REASONS[1].right);
  await nextTurn(page, true);
  await expect(page.getByRole("heading", { name: "You won!" })).toBeVisible();
  await page.getByLabel("The logo and styles rarely change.").check();
  await page.getByLabel("A new logo shows only after the TTL ends.").check();
  await page.getByRole("button", { name: "Save my ticks" }).click();
}

test("Discuss in Claude copies the battle, opens claude.ai, and saves the 2 teach-back sentences", async ({ page }) => {
  await standInForClaude(page);
  await fakeClipboard(page, "keep");
  const user = await signInNewUser(page, "discuss");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await winSaleDay(page);

    const claude = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Discuss in Claude" }).click();
    expect((await claude).url()).toBe("https://claude.ai/new");

    await expect(page.getByText("Copied. Paste it into the new Claude chat.")).toBeVisible();
    // The copy worked, so there is no text box for a manual copy.
    await expect(page.getByLabel("Battle package")).toHaveCount(0);
    const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
    expect(copied).toHaveLength(1);
    const [text] = copied;
    expect(text.startsWith("Privacy reminder:")).toBe(true);
    expect(text).toContain("You are my tech lead coach. Below is my battle and the model answer.");
    // The learner's own words when they typed some, else the Reason they picked.
    expect(text).toContain("- My why: The logo rarely changes, so a copy can live for an hour.");
    expect(text).toContain(`- My why: ${SALE_DAY_REASONS[1].right}`);
    expect(text).toContain("- [x] The logo and styles rarely change.\n- [ ] A TTL lets browsers reuse their copy.");
    expect(text).toContain("Source: MDN: HTTP caching, https://developer.mozilla.org/");
    expect(text).not.toContain(user.email);

    const accessibility = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(accessibility.violations).toEqual([]);

    // Back from the chat: 2 sentences from memory.
    const save = page.getByRole("button", { name: "Save my 2 sentences" });
    await page.getByLabel("Sentence 1").fill("A TTL says how long a copy stays fresh.");
    await expect(save).toBeDisabled();
    await page.getByLabel("Sentence 2").fill("A price needs no-store, so nobody sees an old one.");
    await save.click();
    await expect(page.getByText("Saved. You will see them again at your next review.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();

    await expect
      .poll(() =>
        sql<{ copied: boolean }>(
          local,
          `select copied from battle_discuss_events d join auth.users u on u.id = d.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ copied: true }]);
    await expect
      .poll(() =>
        sql<{ item_ids: string[]; first_sentence: string; second_sentence: string }>(
          local,
          `select item_ids, first_sentence, second_sentence from battle_teach_back_events t
             join auth.users u on u.id = t.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([
        {
          item_ids: ["cache.ttl", "cache", "cache.no-store"],
          first_sentence: "A TTL says how long a copy stays fresh.",
          second_sentence: "A price needs no-store, so nobody sees an old one.",
        },
      ]);
  } finally {
    await user.forget();
  }
});

test("when clipboard access is denied, a text box shows the package for a manual copy", async ({ page }) => {
  await standInForClaude(page);
  await fakeClipboard(page, "deny");
  const user = await signInNewUser(page, "discuss-denied");
  try {
    await catchItems(user.email, ["cache", "cookie", "proxy"]);
    await winSaleDay(page);

    await page.getByRole("button", { name: "Discuss in Claude" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "The copy did not work. Copy the text below by hand, then paste it into Claude." }),
    ).toBeVisible();
    const box = page.getByLabel("Battle package");
    await expect(box).toBeVisible();
    await expect(box).toHaveValue(/^Privacy reminder:/);
    await expect(box).toHaveValue(/Show me two English mistakes and ask me to fix them\./);
    await expect(page.getByRole("link", { name: "Open claude.ai" })).toHaveAttribute("href", "https://claude.ai/new");

    const accessibility = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(accessibility.violations).toEqual([]);

    await expect
      .poll(() =>
        sql<{ copied: boolean }>(
          local,
          `select copied from battle_discuss_events d join auth.users u on u.id = d.user_id where u.email = $1`,
          [user.email],
        ),
      )
      .toEqual([{ copied: false }]);
  } finally {
    await user.forget();
  }
});

test("the 2 sentences come back at the next review of an item of the battle", async ({ page }) => {
  const user = await signInNewUser(page, "teach-back");
  try {
    // TTL was caught yesterday, so it is due today. Yesterday's battle left a teach-back on it.
    await catchItems(user.email, ["cache.ttl"], 1);
    await sql(
      local,
      `with u as (select id from auth.users where email = $1)
       insert into battle_teach_back_events (user_id, client_event_id, session_id, occurred_at, battle_id, scenario_id,
                                             content_hash, item_ids, first_sentence, second_sentence)
       select id, gen_random_uuid(), gen_random_uuid(), now() - interval '1 day', gen_random_uuid(), 't99-sale-day',
              '0123456789abcdef', array['cache.ttl', 'cache'], 'A TTL says how long a copy stays fresh.',
              'A long TTL makes a new logo show late.' from u`,
      [user.email],
    );
    await page.getByRole("button", { name: "3 minutes" }).click();
    await expect(page.getByRole("heading", { name: "Review 1 of 1: TTL" })).toBeVisible();
    // Before Reveal the sentences stay hidden: they hold the answer.
    await expect(page.getByText("A TTL says how long a copy stays fresh.")).toHaveCount(0);
    await page.getByRole("button", { name: "Reveal" }).click();

    await expect(page.getByText("Your own words after the battle Sale day:")).toBeVisible();
    await expect(page.getByText("A TTL says how long a copy stays fresh.")).toBeVisible();
    await expect(page.getByText("A long TTL makes a new logo show late.")).toBeVisible();
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText("All done for today.")).toBeVisible();
  } finally {
    await user.forget();
  }
});
