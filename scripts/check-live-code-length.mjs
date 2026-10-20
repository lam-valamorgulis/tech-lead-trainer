// Checks that the live Supabase project sends sign-in codes of the length the screen accepts.
//   npm run check:live-code [-- --email someone@example.com]
// Run it at "ship" and at the end of production setup. It reads SUPABASE_PROJECT_REF,
// NEXT_PUBLIC_SUPABASE_URL and OWNER_EMAIL from .env.wizard, and gets the secret key through
// the Supabase CLI login. It never prints the key and sends no email.
// The email must be on the allow list, because Supabase creates its account if it does not exist yet.
// The sampled code replaces any code that account has waiting: the last emailed code stops working.
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { readLiveSupabase } from "./live-supabase.mjs";
import { SIGN_IN_CODE_LENGTH, codeLengthProblem, sampleSignInCode } from "../src/lib/auth/code-length.ts";

const { values: args } = parseArgs({ options: { email: { type: "string" } } });
const live = readLiveSupabase();
const env = live.env;
const email = args.email ?? env.OWNER_EMAIL;
if (!email) throw new Error("No email to check with. Pass --email, or set OWNER_EMAIL in .env.wizard.");

const admin = createClient(live.url, live.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const allowed = await admin.from("allowed_emails").select("email").eq("email", email.toLowerCase()).maybeSingle();
if (allowed.error) throw allowed.error;
if (!allowed.data) throw new Error(`${email} is not on the live allow list. Use an email that is.`);

const problem = codeLengthProblem(await sampleSignInCode(admin, email));
if (problem) {
  console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ The live project sends ${SIGN_IN_CODE_LENGTH}-digit codes, the length the screen accepts.`);
