"use server";

import { requestSignInCode, type RequestCodeResult } from "@/lib/auth/request-code";
import { serverAdminClient, serverPublicClient } from "@/lib/supabase/server";

export async function sendSignInCode(email: string): Promise<RequestCodeResult> {
  if (typeof email !== "string") return { status: "invalid-email" };
  return requestSignInCode(email, { admin: serverAdminClient(), publicClient: serverPublicClient() });
}
