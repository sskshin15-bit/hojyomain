"use server"

import { createClient } from "@supabase/supabase-js"

export type GlossaryRow = {
  id: string
  term: string
  user_tooltip: string
  source_type: "ai" | "manual" | null
  source_detail: string | null
  source_url: string | null
  judgment_factor: string | null
  created_at?: string
  updated_at?: string
}

export async function getGlossaries(): Promise<{ data: GlossaryRow[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { data: [], error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from("glossaries")
    .select("id, term, user_tooltip, source_type, source_detail, source_url, judgment_factor, created_at, updated_at")
    .order("term", { ascending: true })
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as GlossaryRow[], error: null }
}

export async function createGlossary(term: string, user_tooltip: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from("glossaries")
    .insert({
      term: term.trim(),
      user_tooltip: user_tooltip.trim() || "",
      source_type: "manual",
      source_detail: "管理画面から手動登録",
      judgment_factor: null,
    })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateGlossary(
  id: string,
  term: string,
  user_tooltip: string
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from("glossaries")
    .update({
      term: term.trim(),
      user_tooltip: user_tooltip.trim() || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteGlossary(id: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase.from("glossaries").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
