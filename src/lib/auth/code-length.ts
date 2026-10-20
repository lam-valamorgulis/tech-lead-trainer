import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The number of digits in the emailed sign-in code. The screen, local Supabase
 * (`otp_length` in `supabase/config.toml`) and the live project must all use it.
 */
export const SIGN_IN_CODE_LENGTH = 6;

/**
 * Compares a real code from Supabase with the length the screen accepts.
 * Returns a message to show when they differ, or null when the code fits.
 */
export function codeLengthProblem(code: string): string | null {
  if (!/^\d+$/.test(code)) return `The live sign-in code is not ${SIGN_IN_CODE_LENGTH} digits: it has other characters.`;
  if (code.length === SIGN_IN_CODE_LENGTH) return null;
  return (
    `The live sign-in code has ${code.length} digits, but the screen asks for ${SIGN_IN_CODE_LENGTH}. ` +
    `Set Email OTP Length to ${SIGN_IN_CODE_LENGTH} in Supabase.`
  );
}

/**
 * Gets a real sign-in code for an existing account from the admin API. No email is sent.
 * It replaces any code that account has waiting, so the last emailed code stops working.
 *
 * @param admin a client with the secret key
 */
export async function sampleSignInCode(admin: SupabaseClient, email: string): Promise<string> {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  return link.data.properties.email_otp;
}
