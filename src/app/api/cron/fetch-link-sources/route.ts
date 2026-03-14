import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { extractUrlsFromText } from "@/lib/link-extractor"
import {
  fetchAndExtractFromUrl,
  buildDescriptionFromSources,
  buildDescriptionMerged,
  type SourceExtractItem,
} from "@/lib/fetch-link-content"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const SUBSIDIES_PER_RUN = 12
const URLS_PER_SUBSIDY = 5
const DELAY_BETWEEN_FETCHES_MS = 2000

export type LinkProgressEvent = {
  phase: "start" | "progress" | "done" | "error"
  message?: string
  processed?: number
  total_subsidies?: number
  subsidy_index?: number
  url_index?: number
  urls_in_subsidy?: number
  success_count?: number
  failed_count?: number
  error?: string
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get("authorization")
  const cronKey = request.headers.get("x-cron-key")
  const providedKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cronKey

  if (providedKey !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const wantStream = request.headers.get("x-stream-progress") === "1"

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase env vars not set." },
      { status: 500 }
    )
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })

  let subsidyIdFilter: string | null = null
  try {
    const body = await request.text()
    if (body) {
      const json = JSON.parse(body) as { subsidy_id?: string }
      if (json.subsidy_id?.trim()) subsidyIdFilter = json.subsidy_id.trim()
    }
  } catch {
    /* ignore */
  }

  let query = supabase
    .from("subsidies")
    .select("id, api_id, name, description, skip_fetch_urls")
    .not("description", "is", null)
    .order("created_at", { ascending: true })

  if (subsidyIdFilter) {
    query = query.eq("id", subsidyIdFilter).is("source_extracts", null)
  } else {
    query = query.is("source_extracts", null).limit(SUBSIDIES_PER_RUN * 2)
  }

  const { data: subsidies, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json(
      { error: "Fetch subsidies failed", detail: fetchError.message },
      { status: 500 }
    )
  }

  const candidates = (subsidies ?? []).filter((sub) => {
    const desc = (sub.description as string)?.trim()
    if (!desc) return false
    return extractUrlsFromText(desc).length > 0
  })
  const totalSubsidies = Math.min(candidates.length, SUBSIDIES_PER_RUN)

  if (subsidyIdFilter && candidates.length === 0 && (subsidies ?? []).length === 0) {
    return NextResponse.json(
      {
        message: "この補助金はすでにリンク先取得済みです。",
        processed: 0,
        success_count: 0,
        failed_count: 0,
      },
      { status: 200 }
    )
  }

  const run = async (
    emit: (e: LinkProgressEvent) => void,
    signal?: AbortSignal | null
  ) => {
    let processed = 0
    let successCount = 0
    let failedCount = 0

    emit({
      phase: "start",
      total_subsidies: totalSubsidies,
      message: `対象 ${totalSubsidies} 件の補助金でリンク取得を開始`,
    })

    for (let si = 0; si < candidates.length; si++) {
      if (processed >= SUBSIDIES_PER_RUN) break
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

      const sub = candidates[si]
      const desc = (sub.description as string)?.trim()
      if (!desc) continue
      const urls = extractUrlsFromText(desc)
      const skipSet = new Set((sub.skip_fetch_urls as string[] | null) ?? [])
      const urlsToFetch = urls.filter((u) => !skipSet.has(u.trim()))
      if (urlsToFetch.length === 0) continue

      const uniqueUrls = [...new Set(urlsToFetch)].slice(0, URLS_PER_SUBSIDY)
      const extracts: SourceExtractItem[] = []
      const now = new Date().toISOString()

      for (let ui = 0; ui < uniqueUrls.length; ui++) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_FETCHES_MS))
        const u = uniqueUrls[ui]
        const item = await fetchAndExtractFromUrl(u, now)
        extracts.push(item)
        if (item.status === "success") successCount++
        else failedCount++
        emit({
          phase: "progress",
          processed,
          total_subsidies: totalSubsidies,
          subsidy_index: si + 1,
          url_index: ui + 1,
          urls_in_subsidy: uniqueUrls.length,
          success_count: successCount,
          failed_count: failedCount,
          message: `${si + 1}/${totalSubsidies} 件目・URL ${ui + 1}/${uniqueUrls.length} 取得済み`,
        })
      }

      const descriptionFromSources = buildDescriptionFromSources(extracts)
      const descriptionMerged = buildDescriptionMerged(sub.description as string, extracts)

      const updatePayload: Record<string, unknown> = {
        source_extracts: extracts,
        description_from_sources: descriptionFromSources || null,
        description_merged: descriptionMerged || desc,
      }

      if (descriptionMerged && descriptionMerged.trim().length > 100) {
        try {
          const { extractStructuredSummaryAndGlossary, analyzeSubsidyText, flagDegreeToBoolean } = await import("@/lib/subsidy-ai-parser")
          const { upsertGlossaryTerms } = await import("@/lib/glossary-upsert")
          const extracted = await extractStructuredSummaryAndGlossary(descriptionMerged)
          updatePayload.structured_summary = extracted.structured_summary
          if (extracted.glossary_terms?.length > 0) {
            const firstLink = extracts.find((e) => e.status === "success" && e.source_url)
            await upsertGlossaryTerms(supabase, extracted.glossary_terms, {
              source_type: "ai",
              source_detail: `補助金「${(sub.name as string) || "不明"}」リンク先取得`,
              source_url: firstLink?.source_url ?? null,
              judgment_factor: "一般の意味と補助金審査での意味が異なる用語を抽出",
            })
          }
          const analyzed = await analyzeSubsidyText(descriptionMerged)
          updatePayload.ai_proposed_flags = analyzed.ai_proposed_flags
          updatePayload.structured_requirements = analyzed.structured_requirements
          const f = analyzed.ai_proposed_flags
          updatePayload.is_exclusive_to_scrivener = flagDegreeToBoolean(f.is_exclusive_to_scrivener_degree)
          updatePayload.requires_certified_agency = flagDegreeToBoolean(f.requires_certified_agency_degree)
          updatePayload.has_post_grant_reporting = flagDegreeToBoolean(f.has_post_grant_reporting_degree)
        } catch {
          /* AI解析失敗時はスキップ */
        }
      }

      const { error: updateError } = await supabase
        .from("subsidies")
        .update(updatePayload)
        .eq("id", sub.id)

      if (updateError) {
        failedCount += uniqueUrls.length
        continue
      }
      processed++
    }

    return { processed, success_count: successCount, failed_count: failedCount }
  }

  if (wantStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const e = (obj: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
        }
        try {
          const result = await run(e, request.signal)
          e({
            phase: "done",
            message: "Link source fetch completed.",
            ...result,
          })
        } catch (err) {
          e({
            phase: "error",
            error: err instanceof Error ? err.message : String(err),
          })
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    })
  }

  const result = await run(() => {}, request.signal)
  return NextResponse.json(
    {
      message: "Link source fetch completed.",
      processed: result.processed,
      success_count: result.success_count,
      failed_count: result.failed_count,
    },
    { status: 200 }
  )
}
