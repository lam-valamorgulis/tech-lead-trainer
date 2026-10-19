import { defineConfig, devices } from "@playwright/test";
import { readLocalSupabase } from "./scripts/local-supabase.mjs";

const PORT = 3100;
const isCI = !!process.env.CI;
// The app under test talks only to the local Supabase. Its keys come from `supabase status`.
const local = readLocalSupabase();

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // CI builds first, so it serves the production build. Locally the dev server is enough.
    command: isCI ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: local.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
      SUPABASE_SECRET_KEY: local.secretKey,
      // Seam C uses the fixture town, so tests do not change when monthly content changes.
      NEXT_PUBLIC_CONTENT_SET: "fixture",
    },
  },
});
