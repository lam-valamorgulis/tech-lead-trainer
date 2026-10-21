"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { FEEDBACK_LIMIT, screenOf, type ScreenOverride } from "@/core/feedback";
import { sendFeedback } from "@/lib/feedback";
import { browserClient } from "@/lib/supabase/browser";

// A screen that shares a page with others names itself here: the session runs on home.
let override: ScreenOverride | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** While this screen is open, a Feedback note says it came from `screen`. */
export function useFeedbackScreen(screen: ScreenOverride): void {
  useEffect(() => {
    override = screen;
    listeners.forEach((listener) => listener());
    return () => {
      override = null;
      listeners.forEach((listener) => listener());
    };
  }, [screen]);
}

type State = "writing" | "sending" | "sent" | "failed";

/**
 * The Feedback button in the app frame (design 9 rule 15). It opens a text box and saves the
 * note with the screen's name. A failed send keeps the text, so nothing typed is lost.
 */
export function FeedbackButton() {
  const pathname = usePathname();
  const screen = screenOf(pathname, useSyncExternalStore(subscribe, () => override, () => null));
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<State>("writing");

  function open() {
    if (state === "sent") setState("writing");
    dialog.current?.showModal();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (text.trim() === "" || state === "sending") return;
    setState("sending");
    try {
      await sendFeedback(browserClient(), { screen, message: text });
      setText("");
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="feedback">
      <button type="button" className="frame-button" aria-label="Feedback" title="Feedback" onClick={open}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
          <path d="M4 4h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 8.5h8M8 11.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <dialog ref={dialog} className="feedback-dialog" aria-labelledby="feedback-title">
        <h2 id="feedback-title">Feedback</h2>
        {state === "sent" ? (
          <div className="stack">
            <p role="status">Thanks. Your note is saved.</p>
            <button type="button" className="button-main" onClick={() => dialog.current?.close()}>
              Close
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={send}>
            <label className="field">
              <span className="field-label">What should change on this screen?</span>
              <textarea
                rows={4}
                maxLength={FEEDBACK_LIMIT}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <p role="alert" className="error">
              {state === "failed" ? "We could not send your note. Check your connection and try again." : ""}
            </p>
            <button type="submit" className="button-main" disabled={text.trim() === "" || state === "sending"}>
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            <button type="button" className="button-quiet" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
          </form>
        )}
      </dialog>
    </div>
  );
}
