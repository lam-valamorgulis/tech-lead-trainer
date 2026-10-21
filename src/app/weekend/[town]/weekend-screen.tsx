"use client";

import { getTown, weekendBoss } from "@/content";
import type { Boss, SituationBlock } from "@/content/weekend";
import { DESIGN_DOC_SECTIONS, designDocPackage, type DesignDoc } from "@/core/design-doc";
import { browserClient } from "@/lib/supabase/browser";
import { loadDesignDoc, saveDesignDoc } from "@/lib/weekend-doc";
import { useMermaidSvg } from "../../use-mermaid-svg";
import { ColleagueRead, DiscussDoc, DocField, SaveStatus, WeekendTabs } from "../weekend-parts";
import { useAutosaved, type SaveState } from "./use-autosaved-doc";

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
  return (
    <div className="stack">
      <WeekendTabs townId={townId} current="boss" />
      <BossDoc documentKey={`${townId}-boss`} boss={boss} />
    </div>
  );
}

const EMPTY_DOC: Omit<DesignDoc, "diagram"> = {
  problem: "",
  options: "",
  decision: "",
  tradeOffs: "",
  risks: "",
};

function BossDoc({ documentKey, boss }: { documentKey: string; boss: Boss }) {
  const {
    value: doc,
    failed,
    saveState,
    change,
  } = useAutosaved<DesignDoc>(
    documentKey,
    // A new doc starts from the boss's diagram starter.
    async () =>
      (await loadDesignDoc(browserClient(), documentKey)) ?? {
        ...EMPTY_DOC,
        diagram: boss.mermaidStarter,
      },
    (next) => saveDesignDoc(browserClient(), documentKey, next),
  );
  if (failed)
    return (
      <p role="alert" className="error">
        We could not load your design doc. Check your connection.
      </p>
    );
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
      <ColleagueRead documentKey={documentKey} saveDocument={() => saveDesignDoc(browserClient(), documentKey, doc)} />
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

function DocEditor({
  doc,
  saveState,
  onChange,
}: {
  doc: DesignDoc;
  saveState: SaveState;
  onChange: (doc: DesignDoc) => void;
}) {
  return (
    <section className="stack" aria-label="Design doc">
      {DESIGN_DOC_SECTIONS.map(({ key, title, hint }) => (
        <DocField key={key} id={`doc-${key}`} title={title} hint={hint}>
          {(props) => (
            <textarea
              {...props}
              rows={4}
              maxLength={20000}
              value={doc[key]}
              onChange={(event) => onChange({ ...doc, [key]: event.target.value })}
            />
          )}
        </DocField>
      ))}
      <DocField
        id="doc-diagram"
        title="Mermaid diagram"
        hint="A drawing made from a few lines of text. The preview draws it."
      >
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
      <SaveStatus state={saveState} />
    </section>
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

/** The live preview. */
function MermaidPreview({ source }: { source: string }) {
  const { svg, problem } = useMermaidSvg(source, { delayMs: DRAW_AFTER_MS, keepLastDrawing: true });

  return (
    <section className="card stack diagram-preview" aria-label="Diagram preview">
      <h2>Preview</h2>
      {problem && (
        <p role="status" className="error">
          {problem}
        </p>
      )}
      {/* The last good drawing stays while a change has a mistake. Mermaid's strict mode cleans the SVG. */}
      {svg ? (
        <div className="diagram" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        !problem && <p className="lead">Drawing…</p>
      )}
    </section>
  );
}
