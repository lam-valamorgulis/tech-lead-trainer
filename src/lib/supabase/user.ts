import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** A server-side client that acts as the user who sent `token`, so row-level security applies. */
export function serverUserClient(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/);
  return match?.[1];
}

/** The signed-in user of a request, with a client that acts as them. Null when not signed in. */
export async function authenticate(request: Request): Promise<{ client: SupabaseClient; userId: string } | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const client = serverUserClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { client, userId: data.user.id };
}
