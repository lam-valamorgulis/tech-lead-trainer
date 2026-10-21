"use client";

import { useEffect, useId, useState } from "react";
import { mermaidProblem } from "@/lib/mermaid-problem";

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;

/** Mermaid is large, so it loads only where a diagram shows, on first use, and is set up once. */
function loadMermaid() {
  mermaidReady ??= import("mermaid").then(({ default: mermaid }) => {
    // Strict: no text can ever run a script in the drawing. A failed drawing adds no error box to
    // the page; the screen says what is wrong in plain words.
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
      suppressErrorRendering: true,
    });
    return mermaid;
  });
  return mermaidReady;
}

/**
 * Draws Mermaid text as SVG, `delayMs` after the last change (the weekend editor waits while the
 * learner types). The last good drawing stays while a change has a mistake.
 */
export function useMermaidSvg(source: string, delayMs = 0): { svg: string | null; problem: string | null } {
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
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(wait);
    };
  }, [source, id, delayMs]);

  return { svg, problem };
}
