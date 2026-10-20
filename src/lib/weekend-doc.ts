import type { SupabaseClient } from "@supabase/supabase-js";
import { ADR_SECTIONS, ADR_STATUSES, type AdrCheck, type AdrSectionKey, type AdrStatus } from "@/core/adr";
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

/** The weekend ADR: its parts, its status, and the day to check the real outcome. */
export type AdrDoc = {
  sections: Record<AdrSectionKey, string>;
  status: AdrStatus;
  outcomeCheckDate: string | null;
};

type AdrRow = { sections: Record<string, unknown>; outcome_check_date: string | null; created_at: string };

/** The learner's ADR for a key such as t01-adr, with the day it was first saved, or null before that. */
export async function loadAdr(
  client: SupabaseClient,
  documentKey: string,
): Promise<{ adr: AdrDoc; writtenOn: string } | null> {
  const { data, error } = await client
    .from("weekend_documents")
    .select("sections, outcome_check_date, created_at")
    .eq("document_key", documentKey)
    .maybeSingle<AdrRow>();
  if (error) throw error;
  if (!data) return null;
  const text = (key: string) => (typeof data.sections[key] === "string" ? (data.sections[key] as string) : "");
  const status = text("status");
  return {
    adr: {
      sections: Object.fromEntries(ADR_SECTIONS.map(({ key }) => [key, text(key)])) as Record<AdrSectionKey, string>,
      status: (ADR_STATUSES as readonly string[]).includes(status) ? (status as AdrStatus) : "proposed",
      outcomeCheckDate: data.outcome_check_date,
    },
    writtenOn: data.created_at.slice(0, 10),
  };
}

/** Saves the whole ADR. One row per learner and key: a later save replaces it. */
export async function saveAdr(client: SupabaseClient, documentKey: string, adr: AdrDoc): Promise<void> {
  const { error } = await client.from("weekend_documents").upsert(
    {
      document_key: documentKey,
      kind: "adr",
      sections: { ...adr.sections, status: adr.status },
      outcome_check_date: adr.outcomeCheckDate,
    },
    { onConflict: "user_id,document_key" },
  );
  if (error) throw error;
}

/** "A colleague read this" (spec story 92), on any weekend document that exists. */
export async function loadColleagueRead(client: SupabaseClient, documentKey: string): Promise<boolean> {
  const { data, error } = await client
    .from("weekend_documents")
    .select("colleague_read")
    .eq("document_key", documentKey)
    .maybeSingle<{ colleague_read: boolean }>();
  if (error) throw error;
  return data?.colleague_read ?? false;
}

export async function saveColleagueRead(client: SupabaseClient, documentKey: string, read: boolean): Promise<void> {
  const { error } = await client
    .from("weekend_documents")
    .upsert(
      { document_key: documentKey, kind: documentKey.endsWith("-adr") ? "adr" : "boss", colleague_read: read },
      { onConflict: "user_id,document_key" },
    );
  if (error) throw error;
}

/** The outcome check of every ADR of the signed-in learner, with the town it belongs to. */
export async function loadAdrChecks(client: SupabaseClient): Promise<(AdrCheck & { townId: string })[]> {
  const { data, error } = await client
    .from("weekend_documents")
    .select("document_key, outcome_check_date, sections")
    .eq("kind", "adr")
    .returns<{ document_key: string; outcome_check_date: string | null; sections: Record<string, unknown> }[]>();
  if (error) throw error;
  return data.map((row) => ({
    townId: row.document_key.slice(0, 3),
    outcomeCheckDate: row.outcome_check_date,
    outcome: typeof row.sections.outcome === "string" ? row.sections.outcome : "",
  }));
}
