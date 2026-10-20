// Writes .env.local for `npm run dev` from the running local Supabase.
// It refuses to replace a file that points at a database that is not local.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { assertLocalDatabase } from "../src/lib/local-database.ts";
import { readLocalSupabase } from "./local-supabase.mjs";

const path = ".env.local";
if (existsSync(path)) {
  const current = readFileSync(path, "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1];
  if (current) assertLocalDatabase(current.trim());
}

const local = readLocalSupabase();
writeFileSync(
  path,
  [
    "# Written by `npm run env:local`. Local Supabase only.",
    `NEXT_PUBLIC_SUPABASE_URL=${local.url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${local.publishableKey}`,
    `SUPABASE_SECRET_KEY=${local.secretKey}`,
    "",
  ].join("\n"),
);
console.log(`Wrote ${path} for ${local.url}`);
