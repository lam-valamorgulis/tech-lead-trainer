import type { SupabaseClient } from "@supabase/supabase-js";
import type { DesignDoc } from "@/core/design-doc";

type Row = { problem: string; options: string; decision: string; trade_offs: string; risks: string; diagram: string };

const COLUMNS = "problem, options, decision, trade_offs, risks, diagram";

/** The signed-in learner's design doc for a key such as t01-boss, or null before the first save. */
export async function loadDesignDoc(client: SupabaseClient, documentKey: string): Promise<DesignDoc | null> {
  const { data, error } = await client
    .from("weekend_documents")
    .select(COLUMNS)
    .eq("document_key", documentKey)
    .maybeSingle<Row>();
  if (error) throw error;
  if (!data) return null;
  return {
    problem: data.problem,
    options: data.options,
    decision: data.decision,
    tradeOffs: data.trade_offs,
    risks: data.risks,
    diagram: data.diagram,
  };
}

/** Saves the whole doc. One row per learner and key: a later save replaces the text. */
export async function saveDesignDoc(client: SupabaseClient, documentKey: string, doc: DesignDoc): Promise<void> {
  const { error } = await client.from("weekend_documents").upsert(
    {
      document_key: documentKey,
      kind: "boss",
      problem: doc.problem,
      options: doc.options,
      decision: doc.decision,
      trade_offs: doc.tradeOffs,
      risks: doc.risks,
      diagram: doc.diagram,
    },
    { onConflict: "user_id,document_key" },
  );
  if (error) throw error;
}
