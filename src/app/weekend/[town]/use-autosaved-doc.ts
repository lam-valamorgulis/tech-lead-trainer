"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignDoc } from "@/core/design-doc";
import { browserClient } from "@/lib/supabase/browser";
import { loadDesignDoc, saveDesignDoc } from "@/lib/weekend-doc";

/** Saves this long after the last key press, so a fast typist sends one save, not one per key. */
const SAVE_AFTER_MS = 800;

export type SaveState = "saving" | "saved" | "failed" | null;

const EMPTY: Omit<DesignDoc, "diagram"> = { problem: "", options: "", decision: "", tradeOffs: "", risks: "" };

/**
 * A design doc that saves as the learner types. One save runs at a time, so an older save never
 * lands after a newer one. Text that is not saved yet stays marked until a save works, and it
 * goes out at once when the tab closes or hides.
 */
export function useAutosavedDoc(documentKey: string, diagramStarter: string) {
  const { doc, setDoc, failed } = useStoredDoc(documentKey, diagramStarter);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const unsaved = useRef<DesignDoc | null>(null);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function flush() {
    clearTimeout(timer.current);
    const next = unsaved.current;
    if (!next || saving.current) return;
    saving.current = true;
    setSaveState("saving");
    try {
      await saveDesignDoc(browserClient(), documentKey, next);
      if (unsaved.current === next) {
        unsaved.current = null;
        setSaveState("saved");
      }
    } catch {
      setSaveState("failed");
    } finally {
      saving.current = false;
      // A change made during the save goes out now.
      if (unsaved.current && unsaved.current !== next) void flush();
    }
  }

  useEffect(() => {
    const onLeave = () => void flush();
    const onHide = () => document.visibilityState === "hidden" && onLeave();
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onHide);
      onLeave();
    };
    // flush reads refs only, so the listeners never need to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(next: DesignDoc) {
    setDoc(next);
    unsaved.current = next;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_AFTER_MS);
  }

  return { doc, failed, saveState, change };
}

/** The saved doc, or a new one that starts from the boss's diagram starter. */
function useStoredDoc(documentKey: string, diagramStarter: string) {
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadDesignDoc(browserClient(), documentKey)
      .then((saved) => !cancelled && setDoc(saved ?? { ...EMPTY, diagram: diagramStarter }))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [documentKey, diagramStarter]);
  return { doc, setDoc, failed };
}
