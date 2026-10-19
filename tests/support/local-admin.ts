import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";

// Admin helpers for seams B and C. They talk only to the local Supabase.

export type LocalSupabase = { url: string; publishableKey: string; secretKey: string; databaseUrl: string };

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClientFor(local: LocalSupabase): SupabaseClient {
  return createClient(local.url, local.secretKey, noSession);
}

export function publicClientFor(local: LocalSupabase): SupabaseClient {
  return createClient(local.url, local.publishableKey, noSession);
}

export function testEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@example.test`;
}

export async function allowEmailIn(local: LocalSupabase, email: string): Promise<void> {
  const { error } = await adminClientFor(local).from("allowed_emails").insert({ email });
  if (error) throw new Error(`Could not add ${email} to the allow list: ${error.message}`);
}

export async function sql<Row extends pg.QueryResultRow>(
  local: LocalSupabase,
  text: string,
  values: unknown[] = [],
): Promise<Row[]> {
  const db = new pg.Client({ connectionString: local.databaseUrl });
  await db.connect();
  try {
    return (await db.query<Row>(text, values)).rows;
  } finally {
    await db.end();
  }
}

export async function findUserId(local: LocalSupabase, email: string): Promise<string | undefined> {
  const rows = await sql<{ id: string }>(local, "select id from auth.users where email = $1", [email]);
  return rows[0]?.id;
}

/** Removes everything a test made for this email: the account, its rows and the allow-list entry. */
export async function forgetEmail(local: LocalSupabase, email: string): Promise<void> {
  await sql(local, "delete from auth.users where email = $1", [email]);
  await sql(local, "delete from public.allowed_emails where email = $1", [email]);
}
