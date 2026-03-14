"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClientWithAuth } from "@/lib/supabase/server"
import { extractTextFromPdfUrl } from "@/lib/pdf-parser"
import {
  analyzeSubsidyText,
  generateUpdateSummary,
  extractStructuredSummaryAndGlossary,
  flagDegreeToBoolean,
} from "@/lib/subsidy-ai-parser"
import { upsertGlossaryTerms } from "@/lib/glossary-upsert"
import { buildDescriptionFromSources, buildDescriptionMerged } from "@/lib/fetch-link-content"

export type SourceExtractItem = {
  source_type: "pdf" | "html"
  source_url: string
  fetched_at: string
  status: "success" | "failed"
  extracted_text: string | null
  content_preview: string | null
  error_message?: string
  human_marked?: "dead" | "excluded"
}

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
  pdf_url: string | null
  pdf_raw_text: string | null
  ai_update_summary: string | null
  ai_proposed_flags: {
    is_exclusive_to_scrivener?: boolean
    is_exclusive_to_scrivener_citation?: string | null
    requires_certified_agency?: boolean
    requires_certified_agency_citation?: string | null
    has_post_grant_reporting?: boolean
    has_post_grant_reporting_citation?: string | null
  } | null
  structured_requirements: Record<string, unknown> | null
  source_extracts: SourceExtractItem[] | null
  description_from_sources: string | null
  description_merged: string | null
  structured_summary: { requirements?: string[]; screening_criteria?: string[]; exceptions?: string[]; other?: string[]; uncertain?: string[] } | null
  skip_fetch_urls: string[] | null
  adoption_rate: string | null
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
    .select("id, api_id, name, description, url, deadline, status, ai_memo, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting, pdf_url, pdf_raw_text, ai_update_summary, ai_proposed_flags, structured_requirements, source_extracts, description_from_sources, description_merged, structured_summary, skip_fetch_urls, adoption_rate, created_at")
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

export async function getSubsidyById(id: string): Promise<{ data: SubsidyRow | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { data: null, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from("subsidies")
    .select("id, api_id, name, description, url, deadline, status, ai_memo, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting, pdf_url, pdf_raw_text, ai_update_summary, ai_proposed_flags, structured_requirements, source_extracts, description_from_sources, description_merged, structured_summary, skip_fetch_urls, adoption_rate, created_at")
    .eq("id", id)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as SubsidyRow, error: null }
}

export async function resetLinkAndStructuredData(subsidyId: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from("subsidies")
    .update({
      source_extracts: null,
      description_from_sources: null,
      description_merged: null,
      structured_summary: null,
      structured_requirements: null,
      ai_proposed_flags: null,
    })
    .eq("id", subsidyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** リンクを「リンク切れ」または「参照不要」としてマーク。統合から除外し、次回取得もスキップする */
export async function markSourceExtract(
  subsidyId: string,
  extractIndex: number,
  mark: "dead" | "excluded"
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: row, error: fetchErr } = await supabase
    .from("subsidies")
    .select("description, source_extracts, skip_fetch_urls")
    .eq("id", subsidyId)
    .single()
  if (fetchErr || !row) {
    return { ok: false, error: fetchErr?.message ?? "補助金が見つかりません" }
  }
  const extracts = (row.source_extracts ?? []) as SourceExtractItem[]
  if (extractIndex < 0 || extractIndex >= extracts.length) {
    return { ok: false, error: "指定のリンクが見つかりません" }
  }
  const urlToSkip = extracts[extractIndex].source_url?.trim()
  if (!urlToSkip) {
    return { ok: false, error: "URLがありません" }
  }
  const updated = extracts.map((e, i) =>
    i === extractIndex ? { ...e, human_marked: mark } : e
  )
  const skipList = (row.skip_fetch_urls as string[] | null) ?? []
  const newSkipList = skipList.includes(urlToSkip) ? skipList : [...skipList, urlToSkip]
  const description = (row.description as string) ?? null
  const descriptionFromSources = buildDescriptionFromSources(updated)
  const descriptionMerged = buildDescriptionMerged(description, updated)
  const { error: updateErr } = await supabase
    .from("subsidies")
    .update({
      source_extracts: updated,
      skip_fetch_urls: newSkipList,
      description_from_sources: descriptionFromSources || null,
      description_merged: descriptionMerged || description?.trim() || null,
    })
    .eq("id", subsidyId)
  if (updateErr) return { ok: false, error: updateErr.message }
  return { ok: true }
}

/** 採択率を更新 */
export async function updateAdoptionRate(
  subsidyId: string,
  adoptionRate: string | null
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from("subsidies")
    .update({ adoption_rate: adoptionRate?.trim() || null })
    .eq("id", subsidyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** 確認済み（flags_reviewed）を手動で変更 */
export async function updateFlagsReviewed(
  subsidyId: string,
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from("subsidies")
    .update({ flags_reviewed: value })
    .eq("id", subsidyId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function completeExpertReview(
  id: string,
  payload: {
    structured_requirements: Record<string, unknown> | null
    is_exclusive_to_scrivener: boolean
    requires_certified_agency: boolean
    has_post_grant_reporting: boolean
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
      status: "published",
      structured_requirements: payload.structured_requirements,
      is_exclusive_to_scrivener: payload.is_exclusive_to_scrivener,
      requires_certified_agency: payload.requires_certified_agency,
      has_post_grant_reporting: payload.has_post_grant_reporting,
      flags_reviewed: true,
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateSubsidyAndConfirmFlags(
  id: string,
  payload: {
    name?: string
    description?: string | null
    pdf_url?: string | null
    status?: string
    is_exclusive_to_scrivener?: boolean
    requires_certified_agency?: boolean
    has_post_grant_reporting?: boolean
    adoption_rate?: string | null
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
      ...(payload.pdf_url !== undefined && { pdf_url: payload.pdf_url?.trim() || null }),
      ...(payload.status !== undefined && { status: payload.status }),
      ...(payload.is_exclusive_to_scrivener !== undefined && { is_exclusive_to_scrivener: payload.is_exclusive_to_scrivener }),
      ...(payload.requires_certified_agency !== undefined && { requires_certified_agency: payload.requires_certified_agency }),
      ...(payload.has_post_grant_reporting !== undefined && { has_post_grant_reporting: payload.has_post_grant_reporting }),
      ...(payload.adoption_rate !== undefined && { adoption_rate: payload.adoption_rate?.trim() || null }),
      flags_reviewed: true,
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export type StructuredSummaryInput = {
  requirements?: string[]
  screening_criteria?: string[]
  exceptions?: string[]
  other?: string[]
  uncertain?: string[]
}

export async function updateStructuredSummary(
  id: string,
  structured_summary: StructuredSummaryInput
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const normalized = {
    requirements: structured_summary.requirements ?? [],
    screening_criteria: structured_summary.screening_criteria ?? [],
    exceptions: structured_summary.exceptions ?? [],
    other: structured_summary.other ?? [],
    uncertain: structured_summary.uncertain ?? [],
  }
  const { error } = await supabase
    .from("subsidies")
    .update({ structured_summary: normalized })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function approveAiProposalAndPublish(
  id: string,
  aiProposedFlags: { is_exclusive_to_scrivener: boolean; requires_certified_agency: boolean; has_post_grant_reporting: boolean }
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
      status: "published",
      is_exclusive_to_scrivener: aiProposedFlags.is_exclusive_to_scrivener,
      requires_certified_agency: aiProposedFlags.requires_certified_agency,
      has_post_grant_reporting: aiProposedFlags.has_post_grant_reporting,
      flags_reviewed: true,
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function runPdfAnalysis(
  subsidyId: string,
  pdfUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, error: "Supabase not configured." }
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  try {
    const { data: current } = await supabase
      .from("subsidies")
      .select("pdf_raw_text")
      .eq("id", subsidyId)
      .single()
    const oldText = (current?.pdf_raw_text as string)?.trim() || null

    const rawText = await extractTextFromPdfUrl(pdfUrl)
    const newText = rawText?.trim() || ""

    let structuredRequirements = null
    let aiProposedFlags = null
    let aiUpdateSummary: string | null = null

    let structuredSummary = null
    let glossaryTerms: { term: string; tooltip: string }[] = []

    if (newText) {
      const analyzed = await analyzeSubsidyText(newText)
      structuredRequirements = analyzed.structured_requirements
      aiProposedFlags = analyzed.ai_proposed_flags
      if (oldText && oldText !== newText) {
        aiUpdateSummary = await generateUpdateSummary(oldText, newText)
      }
      try {
        const extracted = await extractStructuredSummaryAndGlossary(newText)
        structuredSummary = extracted.structured_summary
        if (extracted.glossary_terms?.length > 0) {
          glossaryTerms = extracted.glossary_terms
          const { data: subRow } = await supabase
            .from("subsidies")
            .select("name")
            .eq("id", subsidyId)
            .single()
          const subsidyName = (subRow?.name as string) || "不明"
          await upsertGlossaryTerms(supabase, glossaryTerms, {
            source_type: "ai",
            source_detail: `補助金「${subsidyName}」PDF解析`,
            source_url: pdfUrl.trim() || null,
            judgment_factor: "一般の意味と補助金審査での意味が異なる用語を抽出",
          })
        }
      } catch {
        /* AI構造化・用語抽出失敗時はスキップ */
      }
    }

    const updatePayload: Record<string, unknown> = {
      pdf_url: pdfUrl.trim(),
      pdf_raw_text: newText || null,
      structured_requirements: structuredRequirements,
      ai_proposed_flags: aiProposedFlags,
      ai_update_summary: aiUpdateSummary,
      structured_summary: structuredSummary,
    }
    // AI判定した3フラグを一旦自動反映（high のみ ON）。flags_reviewed は false のまま
    if (aiProposedFlags) {
      updatePayload.is_exclusive_to_scrivener = flagDegreeToBoolean(aiProposedFlags.is_exclusive_to_scrivener_degree)
      updatePayload.requires_certified_agency = flagDegreeToBoolean(aiProposedFlags.requires_certified_agency_degree)
      updatePayload.has_post_grant_reporting = flagDegreeToBoolean(aiProposedFlags.has_post_grant_reporting_degree)
    }
    const { error } = await supabase
      .from("subsidies")
      .update(updatePayload)
      .eq("id", subsidyId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export type SyncResult = {
  ok: boolean
  message?: string
  count?: number
  new_count?: number
  needs_review_count?: number
  error?: string
  detail?: string
  hint?: string
}

export async function triggerSubsidySync(): Promise<SyncResult> {
  const supabase = await createServerClientWithAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "ログインしてください。" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { ok: false, error: "管理者のみ実行できます。" }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return { ok: false, error: "CRON_SECRET が設定されていません。" }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 3000}`

  try {
    const res = await fetch(`${baseUrl}/api/cron/sync-subsidies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    })
    const json = (await res.json()) as SyncResult & { count?: number; new_count?: number; needs_review_count?: number; detail?: string }
    if (!res.ok) {
      const msg = [json.error, json.detail].filter(Boolean).join(": ")
      return { ok: false, error: msg || "同期に失敗しました", detail: json.detail, hint: json.hint }
    }
    return {
      ok: true,
      message: json.message ?? "同期完了",
      count: json.count,
      new_count: json.new_count,
      needs_review_count: json.needs_review_count,
      hint: json.hint,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: "同期リクエストに失敗しました", detail: msg }
  }
}

export type FetchLinkSourcesResult = {
  ok: boolean
  message?: string
  processed?: number
  success_count?: number
  failed_count?: number
  error?: string
  detail?: string
}

export async function triggerFetchLinkSources(subsidyId?: string): Promise<FetchLinkSourcesResult> {
  const supabase = await createServerClientWithAuth()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "ログインしてください。" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { ok: false, error: "管理者のみ実行できます。" }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return { ok: false, error: "CRON_SECRET が設定されていません。" }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 3000}`

  try {
    const res = await fetch(`${baseUrl}/api/cron/fetch-link-sources`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subsidyId ? { subsidy_id: subsidyId } : {}),
      cache: "no-store",
    })
    const json = (await res.json()) as FetchLinkSourcesResult & { processed?: number; success_count?: number; failed_count?: number }
    if (!res.ok) {
      return { ok: false, error: json.error ?? "リンク先取得に失敗しました" }
    }
    return {
      ok: true,
      message: json.message ?? "リンク先取得完了",
      processed: json.processed,
      success_count: json.success_count,
      failed_count: json.failed_count,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: "リンク先取得リクエストに失敗しました", detail: msg }
  }
}
