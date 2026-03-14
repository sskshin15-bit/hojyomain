"use server"

import { createClient } from "@supabase/supabase-js"

export type SubsidyRow = {
  id: string
  api_id: string | null
  name: string
  description: string | null
  url: string | null
  deadline: string | null
  status: string | null
  ai_memo: string | null
  flags_reviewed: boolean | null
  is_exclusive_to_scrivener: boolean | null
  requires_certified_agency: boolean | null
  has_post_grant_reporting: boolean | null
  created_at?: string
}

export type AdminSubsidiesFilters = {
  status?: string
  flags_reviewed?: "unreviewed" | "reviewed"
}

export async function getSubsidiesForAdmin(
  filters: AdminSubsidiesFilters
): Promise<{ data: SubsidyRow[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { data: [], error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  let q = supabase
    .from("subsidies")
    .select("id, api_id, name, description, url, deadline, status, ai_memo, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting, created_at")
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    q = q.eq("status", filters.status)
  }
  if (filters.flags_reviewed === "reviewed") {
    q = q.eq("flags_reviewed", true)
  } else if (filters.flags_reviewed === "unreviewed") {
    q = q.or("flags_reviewed.eq.false,flags_reviewed.is.null")
  }

  const { data, error } = await q
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as SubsidyRow[], error: null }
}

export async function updateSubsidyAndConfirmFlags(
  id: string,
  payload: {
    name?: string
    description?: string | null
    status?: string
    is_exclusive_to_scrivener?: boolean
    requires_certified_agency?: boolean
    has_post_grant_reporting?: boolean
    flags_reviewed: true
  }
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from("subsidies")
    .update({
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.status !== undefined && { status: payload.status }),
      ...(payload.is_exclusive_to_scrivener !== undefined && { is_exclusive_to_scrivener: payload.is_exclusive_to_scrivener }),
      ...(payload.requires_certified_agency !== undefined && { requires_certified_agency: payload.requires_certified_agency }),
      ...(payload.has_post_grant_reporting !== undefined && { has_post_grant_reporting: payload.has_post_grant_reporting }),
      flags_reviewed: true,
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
