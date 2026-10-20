"use client";

import { useState, type FormEvent } from "react";
import { addReportNote, reportWrong, type ReportScreen } from "@/lib/report";
import { browserClient } from "@/lib/supabase/browser";

type State =
  | { name: "idle" | "saving" | "failed" }
  | { name: "saved"; id: number; note: "none" | "saving" | "added" | "failed" };

/** "Report wrong" (design 12.3): one tap saves the report; a short note is optional. */
export function ReportWrong({ itemId, contentHash, screen }: { itemId: string; contentHash: string; screen: ReportScreen }) {
  const [state, setState] = useState<State>({ name: "idle" });
  const [note, setNote] = useState("");

  async function report() {
    if (state.name === "saving" || state.name === "saved") return;
    setState({ name: "saving" });
    try {
      const id = await reportWrong(browserClient(), { itemId, contentHash, screen });
      setState({ name: "saved", id, note: "none" });
    } catch {
      setState({ name: "failed" });
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    if (state.name !== "saved" || note.trim() === "") return;
    setState({ ...state, note: "saving" });
    try {
      await addReportNote(browserClient(), state.id, note);
      setState({ ...state, note: "added" });
    } catch {
      setState({ ...state, note: "failed" });
    }
  }

  if (state.name !== "saved") {
    return (
      <div className="report">
        <button type="button" className="button-quiet" disabled={state.name === "saving"} onClick={() => void report()}>
          Report wrong
        </button>
        <p role="alert" className="error">
          {state.name === "failed" ? "We could not save the report. Try again." : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="report stack">
      <p role="status">Thanks. The report is saved.</p>
      {state.note === "added" ? (
        <p role="status" className="lead">
          Note added.
        </p>
      ) : (
        <form className="stack" onSubmit={saveNote}>
          <label className="field">
            <span className="field-label">What is wrong? (optional)</span>
            <input type="text" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <button type="submit" className="button-quiet" disabled={note.trim() === "" || state.note === "saving"}>
            Add note
          </button>
          <p role="alert" className="error">
            {state.note === "failed" ? "We could not save the note. Try again." : ""}
          </p>
        </form>
      )}
    </div>
  );
}
