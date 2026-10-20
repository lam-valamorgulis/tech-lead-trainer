"use client";

import { useEffect, useRef, useState } from "react";

/** Saves this long after the last key press, so a fast typist sends one save, not one per key. */
const SAVE_AFTER_MS = 800;

export type SaveState = "saving" | "saved" | "failed" | null;

/**
 * A weekend document that saves as the learner types. One save runs at a time, so an older save
 * never lands after a newer one. Text that is not saved yet stays marked until a save works, and
 * it goes out at once when the tab closes or hides. `key` names the document; `load` and `save`
 * read and write it.
 */
export function useAutosaved<T>(key: string, load: () => Promise<T>, save: (value: T) => Promise<void>) {
  const { value, setValue, failed } = useLoaded(key, load);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const unsaved = useRef<T | null>(null);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The latest save function, so the leave listeners never go stale.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  async function flush() {
    clearTimeout(timer.current);
    const next = unsaved.current;
    if (next === null || saving.current) return;
    saving.current = true;
    setSaveState("saving");
    try {
      await saveRef.current(next);
      if (unsaved.current === next) {
        unsaved.current = null;
        setSaveState("saved");
      }
    } catch {
      setSaveState("failed");
    } finally {
      saving.current = false;
      // A change made during the save goes out now.
      if (unsaved.current !== null && unsaved.current !== next) void flush();
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

  function change(next: T) {
    setValue(next);
    unsaved.current = next;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_AFTER_MS);
  }

  return { value, failed, saveState, change };
}

/** The stored document, loaded once per key. */
function useLoaded<T>(key: string, load: () => Promise<T>) {
  const [value, setValue] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    let cancelled = false;
    loadRef
      .current()
      .then((loaded) => !cancelled && setValue(loaded))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return { value, setValue, failed };
}
