import { execFileSync } from "node:child_process";
import { assertLocalDatabase } from "../src/lib/local-database.ts";

/**
 * Reads the URLs and keys of the Supabase started by `supabase start`.
 * Tests and `npm run env:local` use this, so a live key is never read from an env file.
 *
 * @returns {{ url: string, publishableKey: string, secretKey: string, databaseUrl: string, mailUrl: string }}
 */
export function readLocalSupabase() {
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
  const status = JSON.parse(output);

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
