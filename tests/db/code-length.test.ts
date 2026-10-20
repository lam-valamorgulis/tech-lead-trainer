import { describe, expect, inject, it } from "vitest";
import { codeLengthProblem, sampleSignInCode } from "@/lib/auth/code-length";
import { countMail } from "../support/mail";
import { adminClient, allowEmail, forgetEmail, publicClient, testEmail } from "./helpers";

describe("sampleSignInCode", () => {
  it("gets a real code of the app's length from Supabase and sends no email", async () => {
    const email = testEmail("sample-code");
    try {
      await allowEmail(email);
      const created = await adminClient().auth.admin.createUser({ email, email_confirm: true });
      expect(created.error).toBeNull();

      const code = await sampleSignInCode(adminClient(), email);

      expect(code).toMatch(/^\d{6}$/);
      expect(codeLengthProblem(code)).toBeNull();
      expect(await countMail(inject("mailUrl"), email)).toBe(0);
      const verified = await publicClient().auth.verifyOtp({ email, token: code, type: "email" });
      expect(verified.error).toBeNull();
    } finally {
      await forgetEmail(email);
    }
  });
});
