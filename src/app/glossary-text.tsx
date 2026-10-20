"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { glossary } from "@/content";
import { glossarySegments } from "@/content/glossary";

/** The browser's popover works from iOS 17. The design supports iOS 16.4, so check first. */
function supportsPopover(): boolean {
  return "popover" in HTMLElement.prototype;
}

/**
 * Content text where each glossary word can be tapped for a simple English definition
 * (design 2). The definition opens in the browser's popover: a tap, Enter or Space opens it,
 * and Escape or "Close" closes it. Without popover support, a tap shows it under the text.
 * The server renders the fallback, and the phone switches after it loads, so both match.
 */
export function GlossaryText({ text }: { text: string }) {
  const id = useId();
  const popover = useSyncExternalStore(subscribeNever, supportsPopover, () => false);
  const [open, setOpen] = useState<number | null>(null);
  const segments = glossarySegments(text, glossary);

  // The definitions come after the text, so the sentence stays whole when it is read or copied.
  // A popover shows in its own top layer, wherever it is in the page.
  return (
    <>
      {segments.map((segment, index) =>
        "word" in segment ? (
          <button
            key={index}
            type="button"
            className="glossary-term"
            {...(popover
              ? { popoverTarget: `${id}-${index}` }
              : { "aria-expanded": open === index, onClick: () => setOpen(open === index ? null : index) })}
          >
            {segment.text}
          </button>
        ) : (
          segment.text
        ),
      )}
      {segments.map((segment, index) =>
        "word" in segment ? (
          <span
            key={index}
            id={`${id}-${index}`}
            className="glossary-popover"
            {...(popover ? { popover: "auto" as const } : { "data-open": open === index ? "" : undefined })}
          >
            <strong>{segment.word}</strong>
            <span>{segment.definition}</span>
            <button
              type="button"
              className="button-quiet"
              {...(popover
                ? { popoverTarget: `${id}-${index}`, popoverTargetAction: "hide" as const }
                : { onClick: () => setOpen(null) })}
            >
              Close
            </button>
          </span>
        ) : null,
      )}
    </>
  );
}

function subscribeNever(): () => void {
  return () => undefined;
}
