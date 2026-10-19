import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";
import { assertLocalDatabase } from "../../src/lib/local-database";

declare module "vitest" {
  export interface ProvidedContext {
    supabaseUrl: string;
    supabaseSecretKey: string;
  }
}

// Reads the URL and keys from the running local Supabase, never from env files,
// so a live project key in .env.local can never reach a test.
export default function setup(project: TestProject) {
  let output: string;
  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error("Local Supabase is not running. Start it with `npm run db:start`.");
  }
  const status = JSON.parse(output) as { API_URL?: string; SECRET_KEY?: string };

  assertLocalDatabase(status.API_URL);
  project.provide("supabaseUrl", status.API_URL!);
  project.provide("supabaseSecretKey", status.SECRET_KEY!);
}
