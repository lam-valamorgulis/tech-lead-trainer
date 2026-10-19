import { describe, expect, inject, it } from "vitest";
import { requestSignInCode } from "@/lib/auth/request-code";
import { codeFrom, countMail, waitForMail } from "../support/mail";
import { adminClient, allowEmail, deleteUser, publicClient, testEmail } from "./helpers";

const deps = () => ({ admin: adminClient(), publicClient: publicClient() });

async function findUser(email: string) {
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((user) => user.email === email);
}

describe("requestSignInCode", () => {
  it("sends a 6-digit code, and no sign-in link, to an allowed email", async () => {
    const email = testEmail("allowed");
    await allowEmail(email);

    const result = await requestSignInCode(email, deps());

    expect(result).toEqual({ status: "sent" });
    const mail = await waitForMail(inject("mailUrl"), email);
    expect(codeFrom(mail)).toMatch(/^\d{6}$/);
    expect(mail.HTML).not.toMatch(/href=/);

    const verified = await publicClient().auth.verifyOtp({ email, token: codeFrom(mail), type: "email" });
    expect(verified.error).toBeNull();
    await deleteUser(verified.data.user!.id);
  });

  it("accepts the email with other capitals and spaces around it", async () => {
    const email = testEmail("capitals");
    await allowEmail(email);

    const result = await requestSignInCode(`  ${email.toUpperCase()} `, deps());

    expect(result).toEqual({ status: "sent" });
    await waitForMail(inject("mailUrl"), email);
    await deleteUser((await findUser(email))!.id);
  });

  it("gives the same neutral answer to an email that is not allowed, but sends nothing", async () => {
    const email = testEmail("stranger");

    const result = await requestSignInCode(email, deps());

    expect(result).toEqual({ status: "sent" });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(await countMail(inject("mailUrl"), email)).toBe(0);
    expect(await findUser(email)).toBeUndefined();
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
    expect(await findUser(email)).toBeUndefined();
    expect(await countMail(inject("mailUrl"), email)).toBe(0);
  });
});
