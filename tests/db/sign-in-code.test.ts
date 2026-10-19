import { describe, expect, inject, it } from "vitest";
import { requestSignInCode } from "@/lib/auth/request-code";
import { codeFrom, countMail, waitForMail } from "../support/mail";
import { adminClient, allowEmail, codeFor, forgetEmail, publicClient, signedInUser, sql, testEmail } from "./helpers";

const deps = () => ({ admin: adminClient(), publicClient: publicClient() });

async function accountExists(email: string): Promise<boolean> {
  return (await sql("select 1 from auth.users where email = $1", [email])).length > 0;
}

describe("requestSignInCode", () => {
  it("sends a 6-digit code, and no sign-in link, to an allowed email", async () => {
    const email = testEmail("allowed");
    try {
      await allowEmail(email);

      expect(await requestSignInCode(email, deps())).toEqual({ status: "sent" });

      const mail = await waitForMail(inject("mailUrl"), email);
      expect(codeFrom(mail)).toMatch(/^\d{6}$/);
      expect(mail.HTML).not.toMatch(/href=/);
      const verified = await publicClient().auth.verifyOtp({ email, token: codeFrom(mail), type: "email" });
      expect(verified.error).toBeNull();
    } finally {
      await forgetEmail(email);
    }
  });

  it("accepts the email with other capitals and spaces around it", async () => {
    const email = testEmail("capitals");
    try {
      await allowEmail(email);
      expect(await requestSignInCode(`  ${email.toUpperCase()} `, deps())).toEqual({ status: "sent" });
      await waitForMail(inject("mailUrl"), email);
    } finally {
      await forgetEmail(email);
    }
  });

  it("gives the same neutral answer to an email that is not allowed, but sends nothing", async () => {
    const email = testEmail("stranger");

    expect(await requestSignInCode(email, deps())).toEqual({ status: "sent" });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(await countMail(inject("mailUrl"), email)).toBe(0);
    expect(await accountExists(email)).toBe(false);
  });

  it("rejects text that is not an email", async () => {
    expect(await requestSignInCode("not-an-email", deps())).toEqual({ status: "invalid-email" });
  });
});

describe("public sign-ups", () => {
  it("are off, so a stranger cannot get a code by calling Supabase directly", async () => {
    const email = testEmail("direct");

    const { error } = await publicClient().auth.signInWithOtp({ email });

    expect(error).not.toBeNull();
    expect(await accountExists(email)).toBe(false);
    expect(await countMail(inject("mailUrl"), email)).toBe(0);
  });
});

describe("an email removed from the allow list", () => {
  it("cannot sign in again, even by calling Supabase directly, until it is added back", async () => {
    const user = await signedInUser("removed");
    try {
      await adminClient().from("allowed_emails").delete().eq("email", user.email);

      const removed = await publicClient().auth.verifyOtp({
        email: user.email,
        token: await codeFor(user.email),
        type: "email",
      });
      expect(removed.error).not.toBeNull();

      await allowEmail(user.email);
      const back = await publicClient().auth.verifyOtp({
        email: user.email,
        token: await codeFor(user.email),
        type: "email",
      });
      expect(back.error).toBeNull();
    } finally {
      await forgetEmail(user.email);
    }
  });
});
