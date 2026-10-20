"use client";

import { useEffect, useId, useState } from "react";
import { getTown, weekendBoss } from "@/content";
import type { Boss, SituationBlock } from "@/content/weekend";
import { DESIGN_DOC_SECTIONS, designDocPackage, type DesignDoc } from "@/core/design-doc";
import { PRIVACY_REMINDER } from "@/core/discuss";
import { mermaidProblem } from "@/lib/mermaid-problem";
import { copyAndOpenClaude } from "../../claude-copy";
import { useAutosavedDoc, type SaveState } from "./use-autosaved-doc";

/** Draws the diagram this long after the last change. */
const DRAW_AFTER_MS = 400;

/**
 * The weekend boss (design 3, week 1): the situation, then a design doc template next to a live
 * Mermaid preview. On a phone the two stack. The doc is saved as the learner types.
 */
export function WeekendScreen({ townId }: { townId: string }) {
  const town = getTown(townId);
  const boss = weekendBoss(townId);
  if (!town || !boss) return <p className="lead">This town has no weekend boss yet.</p>;
  return <BossDoc documentKey={`${townId}-boss`} boss={boss} />;
}

function BossDoc({ documentKey, boss }: { documentKey: string; boss: Boss }) {
  const { doc, failed, saveState, change } = useAutosavedDoc(documentKey, boss.mermaidStarter);
  if (failed) return <p role="alert" className="error">We could not load your design doc. Check your connection.</p>;
  if (!doc) return <p className="lead">Loading…</p>;
  return (
    <div className="stack">
      <section className="card stack" aria-labelledby="boss-title">
        <h2 id="boss-title">{boss.title}</h2>
        {boss.situation.map((block, index) => (
          <Situation key={index} block={block} />
        ))}
      </section>
      <div className="weekend-grid">
        <DocEditor doc={doc} saveState={saveState} onChange={change} />
        <MermaidPreview source={doc.diagram} />
      </div>
      <DiscussDoc text={() => designDocPackage({ boss, doc })} />
      {boss.modelAnswer && (
        <details className="card">
          <summary>Model answer: open it after your chat with the coach</summary>
          <pre className="model-answer">{boss.modelAnswer}</pre>
        </details>
      )}
    </div>
  );
}

function DocEditor({ doc, saveState, onChange }: { doc: DesignDoc; saveState: SaveState; onChange: (doc: DesignDoc) => void }) {
  return (
    <section className="stack" aria-label="Design doc">
      {DESIGN_DOC_SECTIONS.map(({ key, title, hint }) => (
        <DocField key={key} id={`doc-${key}`} title={title} hint={hint}>
          {(props) => (
            <textarea {...props} rows={4} maxLength={20000} value={doc[key]} onChange={(event) => onChange({ ...doc, [key]: event.target.value })} />
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
            onChange={(event) => onChange({ ...doc, diagram: event.target.value })}
          />
        )}
      </DocField>
      <p className="lead" role="status">
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
      </p>
      {saveState === "failed" && (
        <p role="alert" className="error">
          Not saved. Check your connection. Your text stays here, and the app tries again when you type or leave.
        </p>
      )}
    </section>
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

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;

/** Mermaid is large, so it loads only on this page, on first use, and is set up once. */
function loadMermaid() {
  mermaidReady ??= import("mermaid").then(({ default: mermaid }) => {
    // Strict: the learner's text can never run a script in the drawing. A failed drawing adds
    // no error box to the page; the preview says what is wrong in plain words.
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark", suppressErrorRendering: true });
    return mermaid;
  });
  return mermaidReady;
}

/** The live preview. */
function MermaidPreview({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const wait = setTimeout(async () => {
      try {
        const mermaid = await loadMermaid();
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
