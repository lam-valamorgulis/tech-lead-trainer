import type { SupabaseClient } from "@supabase/supabase-js";
import { DESIGN_DOC_SECTIONS, type DesignDoc } from "@/core/design-doc";

type Row = { sections: Record<string, unknown>; diagram: string };

/** The signed-in learner's design doc for a key such as t01-boss, or null before the first save. */
export async function loadDesignDoc(client: SupabaseClient, documentKey: string): Promise<DesignDoc | null> {
  const { data, error } = await client
    .from("weekend_documents")
    .select("sections, diagram")
    .eq("document_key", documentKey)
    .maybeSingle<Row>();
  if (error) throw error;
  if (!data) return null;
  const text = (key: string) => (typeof data.sections[key] === "string" ? (data.sections[key] as string) : "");
  return {
    ...(Object.fromEntries(DESIGN_DOC_SECTIONS.map(({ key }) => [key, text(key)])) as Omit<DesignDoc, "diagram">),
    diagram: data.diagram,
  };
}

/** Saves the whole doc. One row per learner and key: a later save replaces the text. */
export async function saveDesignDoc(client: SupabaseClient, documentKey: string, doc: DesignDoc): Promise<void> {
  const sections = Object.fromEntries(DESIGN_DOC_SECTIONS.map(({ key }) => [key, doc[key]]));
  const { error } = await client
    .from("weekend_documents")
    .upsert({ document_key: documentKey, kind: "boss", sections, diagram: doc.diagram }, { onConflict: "user_id,document_key" });
  if (error) throw error;
}
