import type { SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import {
  adminClientFor,
  allowEmailIn,
  forgetEmail as forgetEmailIn,
  publicClientFor,
  sql as sqlIn,
  testEmail,
  type LocalSupabase,
} from "../support/local-admin";

export { testEmail };

function local(): LocalSupabase {
  return {
    url: inject("supabaseUrl"),
    publishableKey: inject("supabasePublishableKey"),
    secretKey: inject("supabaseSecretKey"),
    databaseUrl: inject("databaseUrl"),
  };
}

export const adminClient = () => adminClientFor(local());
export const publicClient = () => publicClientFor(local());
export const allowEmail = (email: string) => allowEmailIn(local(), email);
export const forgetEmail = (email: string) => forgetEmailIn(local(), email);
export const sql = <Row extends Record<string, unknown>>(text: string, values: unknown[] = []) =>
  sqlIn<Row>(local(), text, values);

/** A real 6-digit code for an existing account, from the admin API. No email is sent. */
export async function codeFor(email: string): Promise<string> {
  const link = await adminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;
  return link.data.properties.email_otp;
}

/** Creates an allowed user and signs them in with a real 6-digit code. */
export async function signedInUser(label: string): Promise<{ id: string; email: string; client: SupabaseClient }> {
  const email = testEmail(label);
  await allowEmail(email);
  const created = await adminClient().auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;

  const client = publicClient();
  const verified = await client.auth.verifyOtp({ email, token: await codeFor(email), type: "email" });
  if (verified.error) throw verified.error;
  return { id: created.data.user.id, email, client };
}
