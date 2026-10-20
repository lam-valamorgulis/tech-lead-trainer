import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

// A valid public push key shape. The browser's push service is stubbed, so nothing is sent.
const TEST_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

/** Pretends the owner added the push keys. */
async function withPushKeys(page: Page) {
  await page.route("**/api/reminders/key", (route) => route.fulfill({ json: { publicKey: TEST_PUBLIC_KEY } }));
}

/** A browser push service that says yes and remembers one device, like an installed iPhone app. */
async function stubPushService(page: Page) {
  await page.addInitScript(() => {
    // The device lives in sessionStorage, so it is still there after a reload.
    const KEY = "test-push-endpoint";
    const subscription = (endpoint: string) =>
      ({
        endpoint,
        unsubscribe: async () => {
          sessionStorage.removeItem(KEY);
          return true;
        },
        toJSON: () => ({ endpoint, keys: { p256dh: "BTestBrowserKey", auth: "testAuth" } }),
      }) as unknown as PushSubscription;
    Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
    Notification.requestPermission = async () => "granted";
    PushManager.prototype.getSubscription = async () => {
      const endpoint = sessionStorage.getItem(KEY);
      return endpoint ? subscription(endpoint) : null;
    };
    PushManager.prototype.subscribe = async () => {
      const endpoint = `https://web.push.apple.com/test-${crypto.randomUUID()}`;
      sessionStorage.setItem(KEY, endpoint);
      return subscription(endpoint);
    };
  });
}

async function openSettings(page: Page) {
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible();
}

test("before the owner adds the push keys, Settings says reminders are not set up, with no error", async ({ page }) => {
  const user = await signInNewUser(page, "remind-off");
  try {
    await openSettings(page);
    await expect(page.getByText("Reminders are not set up yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Turn on reminders" })).toHaveCount(0);
    await expect(page.getByText(/could not|failed|went wrong/i)).toHaveCount(0);
    await expect(page.getByText("The evening reminder comes only on days you have not practised yet.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("Settings changes both reminder times, and they stay after a reload", async ({ page }) => {
  const user = await signInNewUser(page, "remind-times");
  try {
    await openSettings(page);
    await expect(page.getByLabel("Morning reminder")).toHaveValue("07:30");
    await expect(page.getByLabel("Evening reminder")).toHaveValue("20:00");
    await expect(page.getByText(/same reminder time for your first 12 weeks/)).toBeVisible();

    await page.getByLabel("Morning reminder").fill("08:15");
    await page.getByLabel("Evening reminder").fill("21:00");
    await page.getByRole("button", { name: "Save times" }).click();
    await expect(page.getByText("Reminder times saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Morning reminder")).toHaveValue("08:15");
    await expect(page.getByLabel("Evening reminder")).toHaveValue("21:00");

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  } finally {
    await user.forget();
  }
});

test("in Safari before Add to Home Screen, Settings explains how to get reminders", async ({ page }) => {
  // iPhone Safari has no push until the app is on the Home Screen.
  await page.addInitScript(() => {
    delete (window as { PushManager?: unknown }).PushManager;
  });
  await withPushKeys(page);
  const user = await signInNewUser(page, "remind-safari");
  try {
    await openSettings(page);
    await expect(page.getByText("To get reminders on iPhone, add this app to your Home Screen. Then open it from there.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Turn on reminders" })).toHaveCount(0);
  } finally {
    await user.forget();
  }
});

test("one tap turns reminders on for this device, and one tap turns them off", async ({ page, browserName }) => {
  test.skip(
    browserName === "webkit",
    "The test WebKit has no push at all, like iPhone Safari before Add to Home Screen. The Safari test covers it.",
  );
  await stubPushService(page);
  await withPushKeys(page);
  const user = await signInNewUser(page, "remind-on");
  try {
    await openSettings(page);
    await page.getByRole("button", { name: "Turn on reminders" }).click();
    await expect(page.getByText("Reminders are on for this device.")).toBeVisible();

    const rows = () =>
      sql<{ endpoint: string }>(
        local,
        "select s.endpoint from public.push_subscriptions s join auth.users u on u.id = s.user_id where u.email = $1",
        [user.email],
      );
    await expect.poll(async () => (await rows()).length).toBe(1);
    expect((await rows())[0].endpoint).toMatch(/^https:\/\/web\.push\.apple\.com\/test-/);

    await page.reload();
    await expect(page.getByText("Reminders are on for this device.")).toBeVisible();

    await page.getByRole("button", { name: "Turn off reminders" }).click();
    await expect(page.getByRole("button", { name: "Turn on reminders" })).toBeVisible();
    await expect.poll(async () => (await rows()).length).toBe(0);
  } finally {
    await user.forget();
  }
});
