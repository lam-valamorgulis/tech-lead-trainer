"use client";

import { useId } from "react";
import { glossary } from "@/content";
import { glossarySegments } from "@/content/glossary";

/**
 * Content text where each glossary word can be tapped for a simple English definition
 * (design 2). The definition opens in the browser's own popover: a tap, Enter or Space opens
 * it, and Escape, "Close" or a tap outside closes it.
 */
export function GlossaryText({ text }: { text: string }) {
  const id = useId();
  const segments = glossarySegments(text, glossary);
  // The definitions come after the text, so the sentence stays whole when it is read or copied.
  // A popover shows in its own top layer, wherever it is in the page.
  return (
    <>
      {segments.map((segment, index) =>
        segment.word ? (
          <button key={index} type="button" className="glossary-term" popoverTarget={`${id}-${index}`}>
            {segment.text}
          </button>
        ) : (
          segment.text
        ),
      )}
      {segments.map((segment, index) =>
        segment.word ? (
          <span key={index} id={`${id}-${index}`} popover="auto" className="glossary-popover">
            <strong>{segment.word}</strong>
            <span>{segment.definition}</span>
            <button type="button" className="button-quiet" popoverTarget={`${id}-${index}`} popoverTargetAction="hide">
              Close
            </button>
          </span>
        ) : null,
      )}
    </>
  );
}
