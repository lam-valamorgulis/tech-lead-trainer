import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set on the server.`);
  return value;
}

/** Uses the secret key, so it skips row-level security. Import it only from server code. */
export function serverAdminClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), noSession);
}

export function serverPublicClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), noSession);
}
