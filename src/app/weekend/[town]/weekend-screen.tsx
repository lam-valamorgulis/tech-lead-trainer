"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getTown, weekendBoss } from "@/content";
import type { SituationBlock } from "@/content/weekend";
import { DESIGN_DOC_SECTIONS, designDocPackage, type DesignDoc } from "@/core/design-doc";
import { PRIVACY_REMINDER } from "@/core/discuss";
import { mermaidProblem } from "@/lib/mermaid-problem";
import { browserClient } from "@/lib/supabase/browser";
import { loadDesignDoc, saveDesignDoc } from "@/lib/weekend-doc";
import { copyAndOpenClaude } from "../../claude-copy";

/** Saves this long after the last key press, so a fast typist sends one save, not one per key. */
const SAVE_AFTER_MS = 800;
/** Draws the diagram this long after the last change. */
const DRAW_AFTER_MS = 400;

type SaveState = "saved" | "saving" | "failed" | null;

/**
 * The weekend boss (design 3, week 1): the situation, then a design doc template next to a live
 * Mermaid preview. On a phone the two stack. The doc is saved as the learner types.
 */
export function WeekendScreen({ townId }: { townId: string }) {
  const town = getTown(townId);
  const boss = weekendBoss(townId);
  const documentKey = `${townId}-boss`;
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The doc of a save that is still waiting, so leaving the page can send it at once.
  const pending = useRef<DesignDoc | null>(null);

  useEffect(() => {
    if (!boss) return;
    let cancelled = false;
    loadDesignDoc(browserClient(), documentKey)
      .then((saved) => {
        if (cancelled) return;
        // A new doc starts from the boss's diagram starter.
        setDoc(saved ?? { problem: "", options: "", decision: "", tradeOffs: "", risks: "", diagram: boss.mermaidStarter });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [boss, documentKey]);

  // A save still waiting when the page closes goes out at once.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) void saveDesignDoc(browserClient(), documentKey, pending.current).catch(() => undefined);
    },
    [documentKey],
  );

  if (!town || !boss) return <p className="lead">This town has no weekend boss yet.</p>;
  if (failed) return <p role="alert" className="error">We could not load your design doc. Check your connection.</p>;
  if (!doc) return <p className="lead">Loading…</p>;

  function change(next: DesignDoc) {
    setDoc(next);
    setSaveState("saving");
    clearTimeout(timer.current);
    pending.current = next;
    timer.current = setTimeout(() => {
      pending.current = null;
      saveDesignDoc(browserClient(), documentKey, next).then(
        () => setSaveState("saved"),
        () => setSaveState("failed"),
      );
    }, SAVE_AFTER_MS);
  }

  return (
    <div className="stack">
      <section className="card stack" aria-labelledby="boss-title">
        <h2 id="boss-title">{boss.title}</h2>
        {boss.situation.map((block, index) => (
          <Situation key={index} block={block} />
        ))}
      </section>
      <div className="weekend-grid">
        <section className="stack" aria-label="Design doc">
          {DESIGN_DOC_SECTIONS.map(({ key, title, hint }) => (
            <DocField key={key} id={`doc-${key}`} title={title} hint={hint}>
              {(props) => (
                <textarea {...props} rows={4} maxLength={20000} value={doc[key]} onChange={(event) => change({ ...doc, [key]: event.target.value })} />
              )}
            </DocField>
          ))}
          <DocField id="doc-diagram" title="Mermaid diagram" hint="A drawing made from a few lines of text. The preview draws it.">
            {(props) => (
              <textarea
                {...props}
                className="code-input"
                rows={8}
                maxLength={20000}
                spellCheck={false}
                value={doc.diagram}
                onChange={(event) => change({ ...doc, diagram: event.target.value })}
              />
            )}
          </DocField>
          <p className="lead" role="status">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </p>
          {saveState === "failed" && (
            <p role="alert" className="error">
              Not saved. Check your connection. Your text stays here.
            </p>
          )}
        </section>
        <MermaidPreview source={doc.diagram} />
      </div>
      <DiscussDoc text={() => designDocPackage({ boss, doc })} />
    </div>
  );
}

/** A labelled field. The hint is read as a description, so the field's name stays just its title. */
function DocField({
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

/** Inline `code` in the situation shows as code, without the backticks. */
function Situation({ block }: { block: SituationBlock }) {
  if (block.kind === "list") {
    return (
      <ol className="steps">
        {block.items.map((item, index) => (
          <li key={index}>
            <InlineCode text={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <p>
      <InlineCode text={block.text} />
    </p>
  );
}

function InlineCode({ text }: { text: string }) {
  return text.split("`").map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part));
}

/** The live preview. Mermaid is large, so it loads only here, on first use. */
function MermaidPreview({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const wait = setTimeout(async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        // Strict: the learner's text can never run a script or load a page in the drawing.
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        await mermaid.parse(source);
        const { svg: drawn } = await mermaid.render(`diagram-${id}`, source);
        if (!cancelled) {
          setSvg(drawn);
          setProblem(null);
        }
      } catch (error) {
        if (!cancelled) setProblem(mermaidProblem(error instanceof Error ? error.message : String(error)));
      }
    }, DRAW_AFTER_MS);
    return () => {
      cancelled = true;
      clearTimeout(wait);
    };
  }, [source, id]);

  return (
    <section className="card stack diagram-preview" aria-label="Diagram preview">
      <h2>Preview</h2>
      {problem && (
        <p role="status" className="error">
          {problem}
        </p>
      )}
      {/* The last good drawing stays while a change has a mistake. Mermaid's strict mode cleans the SVG. */}
      {svg ? <div className="diagram" dangerouslySetInnerHTML={{ __html: svg }} /> : !problem && <p className="lead">Drawing…</p>}
    </section>
  );
}

type CopyState = "copied" | "failed" | null;

/** "Discuss in Claude" for the design doc: one tap copies it and opens a new chat (design 10). */
function DiscussDoc({ text }: { text: () => string }) {
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
