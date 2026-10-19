import { execFileSync } from "node:child_process";
import { assertLocalDatabase } from "../src/lib/local-database.ts";

/**
 * Reads the URLs and keys of the Supabase started by `supabase start`.
 * Tests and `npm run env:local` use this, so a live key is never read from an env file.
 *
 * @returns {{ url: string, publishableKey: string, secretKey: string, databaseUrl: string, mailUrl: string }}
 */
export function readLocalSupabase() {
  // Playwright loads its config in every worker. The first read is kept in the environment,
  // which workers inherit, so `supabase status` runs only once.
  const cached = process.env.LOCAL_SUPABASE_STATUS;
  const status = cached ? JSON.parse(cached) : readStatus();
  process.env.LOCAL_SUPABASE_STATUS = JSON.stringify(status);

  assertLocalDatabase(status.API_URL);
  assertLocalDatabase(status.DB_URL);
  for (const key of ["PUBLISHABLE_KEY", "SECRET_KEY", "MAILPIT_URL"]) {
    if (!status[key]) {
      throw new Error(`\`supabase status\` did not return ${key}. Update the Supabase CLI.`);
    }
  }
  return {
    url: status.API_URL,
    publishableKey: status.PUBLISHABLE_KEY,
    secretKey: status.SECRET_KEY,
    databaseUrl: status.DB_URL,
    mailUrl: status.MAILPIT_URL,
  };
}

function readStatus() {
  let output;
  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = error?.stderr?.trim();
    throw new Error(
      `Cannot read local Supabase status. Is it running? Start it with \`npm run db:start\`.\n${stderr ?? ""}`,
    );
  }
  return JSON.parse(output);
}
