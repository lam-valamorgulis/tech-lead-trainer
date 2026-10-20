"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PRIVACY_REMINDER } from "@/core/discuss";
import { browserClient } from "@/lib/supabase/browser";
import { loadColleagueRead, saveColleagueRead } from "@/lib/weekend-doc";
import { copyAndOpenClaude } from "../claude-copy";
import type { SaveState } from "./[town]/use-autosaved-doc";

/** The weekend plan of a town (design 3): week 1 boss, week 2 ADR. */
export function WeekendTabs({ townId, current }: { townId: string; current: "boss" | "adr" }) {
  const tabs = [
    { kind: "boss", label: "Week 1: Boss", href: `/weekend/${townId}` },
    { kind: "adr", label: "Week 2: ADR", href: `/weekend/${townId}/adr` },
  ] as const;
  return (
    <nav className="row" aria-label="Weekend tasks">
      {tabs.map((tab) => (
        <Link key={tab.kind} href={tab.href} className="button button-quiet" aria-current={tab.kind === current ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** A labelled field. The hint is read as a description, so the field's name stays just its title. */
export function DocField({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: (props: { id: string; "aria-describedby": string }) => React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {title}
      </label>
      <span id={`${id}-hint`} className="lead">
        {hint}
      </span>
      {children({ id, "aria-describedby": `${id}-hint` })}
    </div>
  );
}

/** "Saving…", "Saved", or what to do when a save failed. */
export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <>
      <p className="lead" role="status">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
      </p>
      {state === "failed" && (
        <p role="alert" className="error">
          Not saved. Check your connection. Your text stays here, and the app tries again when you type or leave.
        </p>
      )}
    </>
  );
}

/** "A colleague read this" (spec story 92): one human review a month is real feedback (design 3). */
export function ColleagueRead({ documentKey }: { documentKey: string }) {
  const [read, setRead] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadColleagueRead(browserClient(), documentKey)
      .then((value) => !cancelled && setRead(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [documentKey]);

  function toggle(next: boolean) {
    setRead(next);
    saveColleagueRead(browserClient(), documentKey, next).catch(() => {
      setRead(!next);
      setFailed(true);
    });
  }

  return (
    <div className="stack">
      <label className="choice">
        <input type="checkbox" checked={read ?? false} disabled={read === null} onChange={(event) => toggle(event.target.checked)} />
        <span>A colleague read this</span>
      </label>
      <p className="lead">Once a month, ask one colleague to read a design doc or an ADR.</p>
      {failed && (
        <p role="alert" className="error">
          The tick was not saved. Check your connection.
        </p>
      )}
    </div>
  );
}

type CopyState = "copied" | "failed" | null;

/** "Discuss in Claude": the privacy reminder first, then one tap copies the text and opens a new chat (design 10). */
export function DiscussDoc({ text }: { text: () => string }) {
  const [copyState, setCopyState] = useState<CopyState>(null);
  const [shown, setShown] = useState("");

  function discuss() {
    const pkg = text();
    setShown(pkg);
    const copy = copyAndOpenClaude(pkg);
    if (!copy) return setCopyState("failed");
    void copy.then((copied) => setCopyState(copied ? "copied" : "failed"));
  }

  return (
    <section className="stack" aria-labelledby="discuss-doc-title">
      <h2 id="discuss-doc-title">Discuss with your coach</h2>
      <p className="notice">{PRIVACY_REMINDER}</p>
      <button type="button" className="button-main" onClick={discuss}>
        Discuss in Claude
      </button>
      {copyState === "copied" && <p role="status">Copied. Paste it into the new Claude chat.</p>}
      {copyState === "failed" && (
        <label className="field">
          <span className="field-label">The copy did not work. Select this text and copy it by hand.</span>
          <textarea rows={8} readOnly value={shown} />
        </label>
      )}
    </section>
  );
}
