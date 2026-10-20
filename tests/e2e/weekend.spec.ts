import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInNewUser } from "../support/e2e";

// Seam C uses the fixture boss of town t99: "Weekend 1 boss: the slow sale page".

test.skip(({ isMobile }) => isMobile, "The weekend editor is a desktop task (design 3).");

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

test("the boss design doc: the situation on top, the template beside a live Mermaid preview, saved as you type", async ({ page }) => {
  await keepCopies(page);
  const user = await signInNewUser(page, "weekend");
  try {
    await page.getByRole("link", { name: "Weekend" }).click();
    await expect(page).toHaveURL(/\/weekend\/t99$/);
    await expect(page.getByRole("heading", { name: "Weekend 1 boss: the slow sale page" })).toBeVisible();
    await expect(page.getByText("Every visitor downloads the same logo again.")).toBeVisible();

    // Desktop: the editor on the left, the preview on the right, side by side.
    const problem = page.getByLabel("Problem");
    const preview = page.getByRole("region", { name: "Diagram preview" });
    const [editorBox, previewBox] = [await problem.boundingBox(), await preview.boundingBox()];
    expect(previewBox!.x).toBeGreaterThan(editorBox!.x + editorBox!.width - 1);

    // The Mermaid starter of the boss is drawn.
    await expect(preview.locator("svg")).toBeVisible();

    await problem.fill("Far visitors wait three seconds for each page.");
    await expect(page.getByText("Saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Problem")).toHaveValue("Far visitors wait three seconds for each page.");

    // A broken diagram: an error in plain words, never Mermaid's own.
    await page.getByLabel("Mermaid diagram").fill("flowchart LR\n  A --> B\n  B -->> C");
    await expect(page.getByText("The diagram has a mistake on line 3. Check the arrows and the names on that line.")).toBeVisible();
    await expect(page.getByText(/Expecting/)).toHaveCount(0);

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);

    const claude = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Discuss in Claude" }).click();
    await claude;
    const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toContain("# Design doc: Weekend 1 boss: the slow sale page");
    expect(copied[0]).toContain("Far visitors wait three seconds for each page.");
    expect(copied[0].startsWith("Privacy reminder:")).toBe(true);
  } finally {
    await user.forget();
  }
});
