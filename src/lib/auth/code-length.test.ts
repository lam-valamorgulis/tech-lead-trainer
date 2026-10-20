import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SIGN_IN_CODE_LENGTH, codeLengthProblem } from "./code-length";

/** Reads `otp_length` from the `[auth.email]` table of `supabase/config.toml`. */
function localOtpLength(): number {
  const config = readFileSync(new URL("../../../supabase/config.toml", import.meta.url), "utf8");
  const authEmail = config.split(/^\[auth\.email\]$/m)[1]?.split(/^\[/m)[0] ?? "";
  const match = authEmail.match(/^otp_length\s*=\s*(\d+)$/m);
  if (!match) throw new Error("No otp_length in [auth.email] of supabase/config.toml");
  return Number(match[1]);
}

describe("sign-in code length", () => {
  it("is 6 digits, the length the screen and the emails were built for", () => {
    expect(SIGN_IN_CODE_LENGTH).toBe(6);
  });

  it("matches the code length of local Supabase", () => {
    expect(localOtpLength()).toBe(SIGN_IN_CODE_LENGTH);
  });

  it("finds no problem when a live code has the app's length", () => {
    expect(codeLengthProblem("123456")).toBeNull();
  });

  it("explains the problem when a live code is longer than the screen accepts", () => {
    expect(codeLengthProblem("12345678")).toBe(
      "The live sign-in code has 8 digits, but the screen asks for 6. Set Email OTP Length to 6 in Supabase.",
    );
  });

  it("explains an empty code as a code with no digits", () => {
    expect(codeLengthProblem("")).toBe(
      "The live sign-in code has 0 digits, but the screen asks for 6. Set Email OTP Length to 6 in Supabase.",
    );
  });

  it("treats a code that is not only digits as a problem", () => {
    expect(codeLengthProblem("12a456")).toBe("The live sign-in code is not 6 digits: it has other characters.");
  });
});
