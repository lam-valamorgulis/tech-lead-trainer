import type { SupabaseClient } from "@supabase/supabase-js";
import { looksLikeEmail, normalizeEmail } from "./email";

export type RequestCodeResult =
  | { status: "sent" }
  | { status: "invalid-email" }
  | { status: "failed" };

type Deps = {
  /** Uses the secret key. Server only. */
  admin: SupabaseClient;
  /** Uses the publishable key. Sends the email. */
  publicClient: SupabaseClient;
};

/**
 * Sends a 6-digit sign-in code, but only to an email on the allow list.
 * An email that is not on the list gets the same "sent" answer and no code,
 * so the answer never tells a stranger who is on the list.
 */
export async function requestSignInCode(rawEmail: string, { admin, publicClient }: Deps): Promise<RequestCodeResult> {
  const email = normalizeEmail(rawEmail);
  if (!looksLikeEmail(email)) return { status: "invalid-email" };

  const allowed = await admin.from("allowed_emails").select("email").eq("email", email).maybeSingle();
  if (allowed.error) return { status: "failed" };
  if (!allowed.data) return { status: "sent" };

  // Public sign-ups are off, so the server creates the account for an allowed email.
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.code !== "email_exists") return { status: "failed" };

  const sent = await publicClient.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (sent.error) return { status: "failed" };
  return { status: "sent" };
}
