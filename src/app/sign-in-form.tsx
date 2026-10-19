"use client";

import { useState, type FormEvent } from "react";
import { normalizeEmail } from "@/lib/auth/email";
import { browserClient } from "@/lib/supabase/browser";
import { sendSignInCode } from "./sign-in-actions";

type Step = { name: "email" } | { name: "code"; email: string; resent: boolean };

const SEND_ERRORS = {
  "invalid-email": "Enter a full email address, for example name@example.com.",
  failed: "We could not send a code. Wait one minute and try again.",
} as const;

export function SignInForm() {
  const [step, setStep] = useState<Step>({ name: "email" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(email: string) {
    setBusy(true);
    setError(null);
    const result = await sendSignInCode(email).catch(() => ({ status: "failed" as const }));
    setBusy(false);
    if (result.status === "sent") setStep({ name: "code", email: normalizeEmail(email), resent: step.name === "code" });
    else setError(SEND_ERRORS[result.status]);
  }

  function onSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCode(String(new FormData(event.currentTarget).get("email") ?? ""));
  }

  async function onVerify(event: FormEvent<HTMLFormElement>, email: string) {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setBusy(true);
    setError(null);
    const { error: verifyError } = await browserClient().auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    // On success the auth gate sees the new session and shows the app.
    if (verifyError) setError("This code did not work. Check it, or ask for a new code.");
  }

  if (step.name === "email") {
    return (
      <form className="stack" onSubmit={onSendCode} noValidate>
        <label className="field">
          <span className="field-label">Email</span>
          <input name="email" type="email" autoComplete="email" inputMode="email" required />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" className="button-main" disabled={busy}>
          Send code
        </button>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={(event) => onVerify(event, step.email)} noValidate>
      <p>{step.resent ? "We sent a new code. Use the newest email." : "If this email can sign in, we sent it a 6-digit code."}</p>
      <p className="lead">{step.email}</p>
      <label className="field">
        <span className="field-label">6-digit code</span>
        <input
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" className="button-main" disabled={busy}>
        Sign in
      </button>
      <button type="button" className="button-quiet" disabled={busy} onClick={() => void sendCode(step.email)}>
        Send a new code
      </button>
      <button
        type="button"
        className="button-quiet"
        onClick={() => {
          setError(null);
          setStep({ name: "email" });
        }}
      >
        Use a different email
      </button>
    </form>
  );
}
