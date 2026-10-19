import { createClient } from "@supabase/supabase-js";
import { describe, expect, inject, it } from "vitest";

describe("local Supabase", () => {
  it("creates, finds and deletes an auth user", async () => {
    const admin = createClient(inject("supabaseUrl"), inject("supabaseSecretKey"), {
      auth: { persistSession: false },
    });
    const email = `smoke-${crypto.randomUUID()}@example.test`;

    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    expect(created.error).toBeNull();
    const id = created.data.user!.id;

    try {
      const found = await admin.auth.admin.getUserById(id);
      expect(found.data.user?.email).toBe(email);
    } finally {
      const deleted = await admin.auth.admin.deleteUser(id);
      expect(deleted.error).toBeNull();
    }
  });
});
