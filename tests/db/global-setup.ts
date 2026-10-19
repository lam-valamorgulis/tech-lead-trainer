import type { TestProject } from "vitest/node";
import { readLocalSupabase } from "../../scripts/local-supabase.mjs";

declare module "vitest" {
  export interface ProvidedContext {
    supabaseUrl: string;
    supabasePublishableKey: string;
    supabaseSecretKey: string;
    databaseUrl: string;
    mailUrl: string;
  }
}

// Reads the URL and keys from the running local Supabase, never from env files,
// so a live project key in .env.local can never reach a test.
export default function setup(project: TestProject) {
  const local = readLocalSupabase();
  project.provide("supabaseUrl", local.url);
  project.provide("supabasePublishableKey", local.publishableKey);
  project.provide("supabaseSecretKey", local.secretKey);
  project.provide("databaseUrl", local.databaseUrl);
  project.provide("mailUrl", local.mailUrl);
}
