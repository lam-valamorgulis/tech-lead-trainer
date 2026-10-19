import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient(): SupabaseClient {
  return createClient(inject("supabaseUrl"), inject("supabaseSecretKey"), noSession);
}

export function publicClient(): SupabaseClient {
  return createClient(inject("supabaseUrl"), inject("supabasePublishableKey"), noSession);
}

export function testEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@example.test`;
}

export async function allowEmail(email: string): Promise<void> {
  const { error } = await adminClient().from("allowed_emails").insert({ email });
  if (error) throw error;
}

/**
 * Creates an allowed user and signs them in with a real 6-digit code.
 * The code comes from the admin API, so no email is sent.
 */
export async function signedInUser(label: string): Promise<{ id: string; email: string; client: SupabaseClient }> {
  const email = testEmail(label);
  const admin = adminClient();
  await allowEmail(email);
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;

  const client = publicClient();
  const verified = await client.auth.verifyOtp({ email, token: link.data.properties.email_otp, type: "email" });
  if (verified.error) throw verified.error;
  return { id: created.data.user.id, email, client };
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(id);
  if (error) throw error;
}
