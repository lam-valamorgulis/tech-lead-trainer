import { expect, test, type Page } from "@playwright/test";
import { local, signInNewUser } from "../support/e2e";
import { sql } from "../support/local-admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / DAY_MS;

async function keepCopies(page: Page) {
  await page.context().route("https://claude.ai/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>Claude</title>" }),
  );
  await page.addInitScript(() => {
    const copied: string[] = [];
    (window as unknown as { copied: string[] }).copied = copied;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
    });
  });
}

test("the weekend ADR: a check date 4 to 8 weeks out, saved as you type, a colleague tick, privacy first", async ({ page, isMobile }) => {
  test.skip(isMobile, "A computer task (design 3).");
  await keepCopies(page);
  const user = await signInNewUser(page, "adr");
  try {
    await page.goto("/weekend/t99");
    await page.getByRole("link", { name: "Week 2: ADR" }).click();
    await expect(page.getByRole("heading", { name: "Week 2: one ADR for a real decision at work" })).toBeVisible();

    // The check date starts 6 weeks out, and only 4 to 8 weeks can be picked.
    const date = page.getByLabel("Check the real outcome on");
    const [min, max, value] = await Promise.all([date.getAttribute("min"), date.getAttribute("max"), date.inputValue()]);
    expect(daysBetween(min!, max!)).toBe(28);
    expect(daysBetween(min!, value)).toBe(14);

    await page.getByLabel("Title", { exact: true }).fill("Prices load in the browser");
    await page.getByLabel("My prediction").fill("Product pages get faster within a month.");
    await page.getByLabel("Status").selectOption("accepted");
    await expect(page.getByText("Saved")).toBeVisible();
    await page.getByRole("checkbox", { name: "A colleague read this" }).check();
    await expect(page.getByText("Tick saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Prices load in the browser");
    await expect(page.getByLabel("Status")).toHaveValue("accepted");
    await expect(page.getByRole("checkbox", { name: "A colleague read this" })).toBeChecked();

    // Work content goes to a personal account, so the privacy reminder comes before the button.
    const reminder = await page.getByText(/^Privacy reminder:/).boundingBox();
    const discuss = page.getByRole("button", { name: "Discuss in Claude" });
    expect(reminder!.y).toBeLessThan((await discuss.boundingBox())!.y);
    const claude = page.waitForEvent("popup");
    await discuss.click();
    await claude;
    const [copied] = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
    expect(copied.startsWith("Privacy reminder:")).toBe(true);
    expect(copied).toContain("# ADR: Prices load in the browser\n\n- Status: accepted");
  } finally {
    await user.forget();
  }
});

test("on the check date, home asks for the real outcome of the ADR", async ({ page }) => {
  const user = await signInNewUser(page, "adr-due");
  try {
    await sql(
      local,
      `insert into weekend_documents (user_id, document_key, kind, sections, outcome_check_date)
       select u.id, 't99-adr', 'adr', '{"title": "Prices in the browser"}'::jsonb,
              private.learning_day(now(), p.home_time_zone, p.day_cutoff_hour)
         from auth.users u join profiles p on p.user_id = u.id where u.email = $1`,
      [user.email],
    );
    await page.reload();
    // The notice sits below the commit buttons, which stay on screen.
    await expect(page.getByRole("link", { name: "Check your ADR" })).toBeVisible();
    const viewport = page.viewportSize()!;
    for (const name of ["3 minutes", "15 minutes", "45 minutes"]) {
      const box = (await page.getByRole("button", { name }).boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.getByRole("link", { name: "Check your ADR" }).click();
    await expect(page).toHaveURL(/\/weekend\/t99\/adr$/);
    await expect(page.getByText("Your check date has come. Write what really happened, under your prediction.")).toBeVisible();
  } finally {
    await user.forget();
  }
});

test("a colleague tick before any typing keeps the ADR check date and the boss diagram starter", async ({ page, isMobile }) => {
  test.skip(isMobile, "A computer task (design 3).");
  const user = await signInNewUser(page, "adr-tick-first");
  try {
    await page.goto("/weekend/t99/adr");
    await page.getByRole("checkbox", { name: "A colleague read this" }).check();
    await expect(page.getByText("Tick saved")).toBeVisible();
    await page.reload();
    const date = page.getByLabel("Check the real outcome on");
    const [min, value] = await Promise.all([date.getAttribute("min"), date.inputValue()]);
    expect(daysBetween(min!, value)).toBe(14);
    await expect(page.getByRole("checkbox", { name: "A colleague read this" })).toBeChecked();

    await page.goto("/weekend/t99");
    await page.getByRole("checkbox", { name: "A colleague read this" }).check();
    await expect(page.getByText("Tick saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Mermaid diagram")).toHaveValue(/^sequenceDiagram/);
    await expect(page.getByRole("checkbox", { name: "A colleague read this" })).toBeChecked();
  } finally {
    await user.forget();
  }
});
