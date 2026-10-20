"use client";

import { useEffect, useState } from "react";
import { fetchLastBackupAt, lastBackupLine } from "@/lib/backup/last-backup";
import { browserClient } from "@/lib/supabase/browser";

type State = { name: "loading" } | { name: "loaded"; at: Date | null } | { name: "failed" };

/** "Last backup: <date>" (ticket #22). A failed week adds no backup, so the old date stays. */
export function LastBackup({ homeTimeZone }: { homeTimeZone: string }) {
  const [state, setState] = useState<State>({ name: "loading" });

  useEffect(() => {
    let current = true;
    fetchLastBackupAt(browserClient()).then(
      (at) => current && setState({ name: "loaded", at }),
      () => current && setState({ name: "failed" }),
    );
    return () => {
      current = false;
    };
  }, []);

  if (state.name === "loading") return <p className="lead">Last backup: …</p>;
  if (state.name === "failed") return <p className="lead">Last backup: could not load</p>;
  const line = lastBackupLine(state.at, new Date(), homeTimeZone);
  return (
    <>
      <p className="lead">{line.text}</p>
      {line.stale && <p className="error">This is more than a week old. The weekly backup may be failing.</p>}
    </>
  );
}
