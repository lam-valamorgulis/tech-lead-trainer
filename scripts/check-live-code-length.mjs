// Checks that the live Supabase project sends sign-in codes of the length the screen accepts.
//   npm run check:live-code [-- --email someone@example.com]
// Run it at "ship" and at the end of production setup. It reads SUPABASE_PROJECT_REF,
// NEXT_PUBLIC_SUPABASE_URL and OWNER_EMAIL from .env.wizard, and gets the secret key through
// the Supabase CLI login. It never prints the key and sends no email.
// Use an email on the allow list. Supabase creates its account if it does not exist yet.
// The sampled code replaces any code that account has waiting: the last emailed code stops working.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { SIGN_IN_CODE_LENGTH, codeLengthProblem, sampleSignInCode } from "../src/lib/auth/code-length.ts";

function readEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function secretKeyFor(projectRef) {
  const output = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", "--project-ref", projectRef, "--reveal", "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  const secret = JSON.parse(output).find((key) => key.type === "secret");
  if (!secret?.api_key || secret.api_key.includes("·")) {
    throw new Error("The Supabase CLI did not return a full secret key. Run `npx supabase login` and try again.");
  }
  return secret.api_key;
}

const { values: args } = parseArgs({ options: { email: { type: "string" } } });
const env = readEnvFile(".env.wizard");
for (const key of ["SUPABASE_PROJECT_REF", "NEXT_PUBLIC_SUPABASE_URL"]) {
  if (!env[key]) throw new Error(`${key} is missing from .env.wizard. Run scripts/setup-production.sh first.`);
}
const email = args.email ?? env.OWNER_EMAIL;
if (!email) throw new Error("No email to check with. Pass --email, or set OWNER_EMAIL in .env.wizard.");

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, secretKeyFor(env.SUPABASE_PROJECT_REF), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const problem = codeLengthProblem(await sampleSignInCode(admin, email));
if (problem) {
  console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ The live project sends ${SIGN_IN_CODE_LENGTH}-digit codes, the length the screen accepts.`);
