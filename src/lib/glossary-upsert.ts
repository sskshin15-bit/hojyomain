import type { SupabaseClient } from "@supabase/supabase-js"

export type GlossaryEntry = { term: string; tooltip: string }

export type GlossarySource = {
  source_type: "ai" | "manual"
  source_detail: string
  source_url?: string | null
  judgment_factor?: string
}

/**
 * 用語を glossaries テーブルに upsert（term が既存なら user_tooltip を更新）
 */
export async function upsertGlossaryTerms(
  supabase: SupabaseClient,
  terms: GlossaryEntry[],
  source?: GlossarySource
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  const sourcePayload = source
    ? {
        source_type: source.source_type,
        source_detail: source.source_detail,
        source_url: source.source_url ?? null,
        judgment_factor: source.judgment_factor ?? null,
      }
    : {}
  for (const { term, tooltip } of terms) {
    const t = term.trim()
    if (!t) continue
    const { data: existing } = await supabase
      .from("glossaries")
      .select("id")
      .eq("term", t)
      .maybeSingle()
    const now = new Date().toISOString()
    if (existing) {
      const { error } = await supabase
        .from("glossaries")
        .update({
          user_tooltip: (tooltip || "").trim(),
          updated_at: now,
          ...sourcePayload,
        })
        .eq("id", existing.id)
      if (!error) updated++
    } else {
      const { error } = await supabase
        .from("glossaries")
        .insert({
          term: t,
          user_tooltip: (tooltip || "").trim(),
          ...sourcePayload,
        })
      if (!error) inserted++
    }
  }
  return { inserted, updated }
}
