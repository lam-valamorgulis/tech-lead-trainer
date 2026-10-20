"use client";

import { useRef, useState, type FormEvent } from "react";
import { itemCard } from "@/content";
import type { BattleState } from "@/core/battle";
import { CLAUDE_NEW_CHAT, discussPackage, teachBackItems } from "@/core/discuss";
import { postEvents } from "@/lib/events/post-events";
import type { BattleEventFields } from "@/lib/events/write-events";
import { keepAboveKeyboard } from "./keyboard";

type CopyState = "copying" | "copied" | "failed";

/**
 * "Discuss in Claude" (design 10, UI rule 12) and the teach-back. One tap copies the battle and
 * opens a new Claude chat. When the copy fails, a text box shows the package for a manual copy.
 * After the chat, the learner writes 2 sentences from memory.
 */
export function DiscussInClaude({
  battle,
  whys,
  ticks,
  eventFields,
  onDone,
}: {
  battle: BattleState;
  whys: Record<number, string>;
  ticks: Record<number, number[]>;
  eventFields: () => BattleEventFields;
  onDone: () => void;
}) {
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  // A fast double tap opens one tab and saves one tap.
  const tapped = useRef(false);

  function report(copied: boolean) {
    setCopyState(copied ? "copied" : "failed");
    void postEvents([{ type: "battle-discuss", clientEventId: crypto.randomUUID(), ...eventFields(), copied }]);
  }

  // Everything up to window.open runs inside the tap: iPhone Safari allows the clipboard write
  // and the new tab only there. The write starts first, then Claude opens.
  function discuss() {
    if (tapped.current) return;
    tapped.current = true;
    const pkg = discussPackage({ battle, whys, ticks, itemOf: itemCard });
    setText(pkg);
    let write: Promise<void> | undefined;
    try {
      write = navigator.clipboard?.writeText(pkg);
    } catch {
      write = undefined;
    }
    if (!write) {
      // No clipboard at all: stay here, so the learner can copy the text box first.
      report(false);
      return;
    }
    setCopyState("copying");
    window.open(CLAUDE_NEW_CHAT, "_blank", "noopener");
    write.then(
      () => report(true),
      () => report(false),
    );
  }

  function saveTeachBack(firstSentence: string, secondSentence: string) {
    void postEvents([
      {
        type: "battle-teach-back",
        clientEventId: crypto.randomUUID(),
        ...eventFields(),
        itemIds: teachBackItems(battle),
        firstSentence,
        secondSentence,
      },
    ]);
    setSaved(true);
  }

  if (copyState === null) {
    return (
      <>
        <p className="lead">Keep learning in your own Claude chat. One tap copies this battle and opens claude.ai.</p>
        <button type="button" className="button-main" onClick={discuss}>
          Discuss in Claude
        </button>
        <button type="button" className="button-quiet" onClick={onDone}>
          Continue
        </button>
      </>
    );
  }

  return (
    <>
      {copyState === "copied" && <p role="status">Copied. Paste it into the new Claude chat.</p>}
      {copyState === "failed" && (
        <>
          <p role="alert" className="error">
            The copy did not work. Copy the text below by hand, then paste it into Claude.
          </p>
          <label className="field">
            <span className="field-label">Battle package</span>
            {/* iPhone Safari ignores select() on a read-only box, so the range is set too. */}
            <textarea
              rows={8}
              readOnly
              value={text}
              onFocus={(event) => {
                event.target.select();
                event.target.setSelectionRange(0, event.target.value.length);
              }}
            />
          </label>
        </>
      )}
      <a className="button button-quiet" href={CLAUDE_NEW_CHAT} target="_blank" rel="noopener noreferrer">
        Open claude.ai
      </a>
      {saved ? (
        <p role="status">Saved. You will see them again at your next review.</p>
      ) : (
        <TeachBackForm onSave={saveTeachBack} />
      )}
      <button type="button" className={saved ? "button-main" : "button-quiet"} onClick={onDone}>
        Continue
      </button>
      {!saved && <div aria-hidden="true" className="keyboard-room" />}
    </>
  );
}

/** Design 10: back from the chat, 2 sentences from memory. Both are needed to save. */
function TeachBackForm({ onSave }: { onSave: (first: string, second: string) => void }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const done = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const ready = first.trim().length > 0 && second.trim().length > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    // A fast double tap saves once.
    if (!ready || done.current) return;
    done.current = true;
    onSave(first.trim(), second.trim());
  }

  const align = () => keepAboveKeyboard(form.current);

  return (
    <form ref={form} className="stack why-form" onSubmit={submit}>
      <h3>After the chat</h3>
      <p className="lead">Write 2 sentences from memory about what you learned. They come back at your next review.</p>
      <label className="field">
        <span className="field-label">Sentence 1</span>
        <textarea rows={2} maxLength={500} value={first} onFocus={align} onChange={(event) => setFirst(event.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Sentence 2</span>
        <textarea rows={2} maxLength={500} value={second} onFocus={align} onChange={(event) => setSecond(event.target.value)} />
      </label>
      <button type="submit" className="button-main" disabled={!ready}>
        Save my 2 sentences
      </button>
    </form>
  );
}
