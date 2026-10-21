"use client";

import { useMermaidSvg } from "./use-mermaid-svg";

/**
 * A diagram of the content (a Lesson screen or a Town Intro), drawn from its Mermaid text. A screen
 * reader gets the boxes and arrows as words instead of the drawing: "Browser to Server".
 */
export function ContentDiagram({ source }: { source: string }) {
  const { svg, problem } = useMermaidSvg(source);
  if (problem) return <p className="lead">The diagram could not be drawn.</p>;
  return (
    <figure className="diagram content-diagram">
      {svg ? <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="lead">Drawing…</p>}
      <figcaption className="visually-hidden">Diagram: {diagramInWords(source)}</figcaption>
    </figure>
  );
}

/** The arrows of a Mermaid diagram as plain words, one line each: "Browser to Server". */
function diagramInWords(source: string): string {
  return source
    .split("\n")
    .slice(1)
    .map((line) => line.trim().replace(/\s*-+>+\s*|\s*->>\s*/g, " to ").replace(/[[\](){}|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(". ");
}
