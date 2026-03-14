import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { stripHtml } from "@/lib/html-clean"

export const dynamic = "force-dynamic"
export const maxDuration = 300

type IncomingSubsidy = {
  api_id: string
  name: string
  description?: string | null
  url?: string | null
  deadline?: string | null
  agency?: string | null
  target_industries?: string[] | null
  max_amount?: number | null
}

type ExistingRow = {
  id: string
  api_id: string
  name: string
  description: string | null
  deadline: string | null
  status: string | null
  flags_reviewed: boolean | null
  is_exclusive_to_scrivener: boolean | null
  requires_certified_agency: boolean | null
  has_post_grant_reporting: boolean | null
}

export type SyncProgressEvent = {
  phase: "fetch" | "fetched" | "enrich" | "upsert" | "done" | "error"
  message?: string
  total?: number
  current?: number
  max?: number
  count?: number
  new_count?: number
  needs_review_count?: number
  archived_count?: number
  error?: string
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").trim()
}

function normalizeDeadline(s: string | null | undefined): string {
  if (!s) return ""
  try {
    return new Date(s).toISOString()
  } catch {
    return String(s).trim()
  }
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

  let payload: { subsidies?: IncomingSubsidy[] } = {}
  try {
    const text = await request.text()
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = {}
  }

  if (wantStream) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const e = (obj: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
        }
        try {
          const result = await runSyncWithPayload(
            { emit: e, signal: request.signal },
            { url, serviceRoleKey, payload }
          )
          e({ phase: "done", ...result.body })
        } catch (err) {
          e({ phase: "error", error: err instanceof Error ? err.message : String(err) })
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    })
  }

  const result = await runSyncWithPayload(
    { emit: () => {}, signal: request.signal },
    { url, serviceRoleKey, payload }
  )
  return NextResponse.json(result.body, { status: result.status })
}

async function runSyncWithPayload(
  options: { emit: (e: SyncProgressEvent) => void; signal?: AbortSignal | null },
  ctx: { url: string; serviceRoleKey: string; payload: { subsidies?: IncomingSubsidy[] } }
): Promise<{ status: number; body: object }> {
  const { emit } = options
  const { url, serviceRoleKey, payload } = ctx
  const jgrantsBase = process.env.JGRANTS_API_BASE_URL?.trim()

  let syncStateNextOffset: number | null = null
  let incoming: Array<{
    api_id: string
    name: string
    description: string | null
    url: string | null
    deadline: string | null
    agency: string | null
    target_industries: string[] | null
    max_amount: number | null
  }> = []

  const useJgrantsApi =
    !!jgrantsBase &&
    (!payload.subsidies ||
      !Array.isArray(payload.subsidies) ||
      payload.subsidies.length === 0)

  if (useJgrantsApi) {
    emit({ phase: "fetch", message: "jGrants API から取得中..." })
    try {
      const supabaseForState = createClient(url, serviceRoleKey, {
        auth: { persistSession: false },
      })
      const { data: stateRow } = await supabaseForState
        .from("cron_sync_state")
        .select("offset_value")
        .eq("key", "subsidies_sync")
        .maybeSingle()
      const startOffset = stateRow?.offset_value ?? 0
      const { fetchSubsidiesChunk, fetchSubsidyDetailById } = await import("@/lib/jgrants")
      const { items, nextOffset } = await fetchSubsidiesChunk("補助", {
        start: startOffset,
        maxPages: 3,
      })
      syncStateNextOffset = nextOffset
      incoming = items
        .filter((s) => s.id && (s.title || s.name))
        .map((s) => ({
          api_id: String(s.id),
          name: (s.title || s.name) || "",
          description: s.detail ? stripHtml(String(s.detail)) : s.subsidy_catch_phrase ? stripHtml(String(s.subsidy_catch_phrase)) : null,
          url: s.front_subsidy_detail_page_url ? String(s.front_subsidy_detail_page_url) : null,
          deadline: s.acceptance_end_datetime ? new Date(s.acceptance_end_datetime).toISOString() : null,
          agency: null,
          target_industries: null,
          max_amount: typeof s.subsidy_max_limit === "number" ? s.subsidy_max_limit : null,
        }))
      emit({ phase: "fetched", total: incoming.length, message: `${incoming.length}件取得` })
      let enriched = 0
      const maxEnrich = Math.min(30, incoming.filter((x) => !x.description).length)
      for (let i = 0; i < incoming.length && enriched < 30; i++) {
        if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")
        if (incoming[i].description) continue
        await new Promise((r) => setTimeout(r, 800))
        const detail = await fetchSubsidyDetailById(incoming[i].api_id)
        if (detail) {
          const desc = detail.detail ? stripHtml(String(detail.detail)) : detail.subsidy_catch_phrase ? stripHtml(String(detail.subsidy_catch_phrase)) : null
          if (desc) {
            incoming[i] = { ...incoming[i], description: desc }
            if (detail.front_subsidy_detail_page_url && !incoming[i].url) {
              incoming[i] = { ...incoming[i], url: String(detail.front_subsidy_detail_page_url) }
            }
            enriched++
            emit({ phase: "enrich", current: enriched, max: 30, message: `詳細取得 ${enriched}/30` })
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      emit({ phase: "error", error: msg })
      return { status: 500, body: { error: "jGrants fetch failed", detail: msg } }
    }
  } else {
    const raw = payload.subsidies
    if (!Array.isArray(raw) || raw.length === 0) {
      emit({ phase: "done", message: "No subsidies to sync." })
      return {
        status: 200,
        body: {
          message: "No subsidies to sync.",
          hint: !jgrantsBase
            ? "Set JGRANTS_API_BASE_URL in .env.local and restart the dev server to sync from jGrants API."
            : "Provide a JSON body with 'subsidies' array, or leave body empty to use jGrants.",
        },
      }
    }
    incoming = raw.map((s) => ({
      api_id: s.api_id,
      name: s.name ?? "",
      description: s.description ? stripHtml(s.description) : null,
      url: s.url ?? null,
      deadline: s.deadline ? new Date(s.deadline).toISOString() : null,
      agency: s.agency ?? null,
      target_industries: s.target_industries ?? null,
      max_amount: s.max_amount ?? null,
    }))
  }

  if (incoming.length === 0) {
    if (syncStateNextOffset !== null && useJgrantsApi) {
      const supabaseForState = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
      await supabaseForState.from("cron_sync_state").upsert(
        { key: "subsidies_sync", offset_value: syncStateNextOffset, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
    }
    emit({ phase: "done", message: "No subsidies to sync.", total: 0 })
    return { status: 200, body: { message: "No subsidies to sync.", hint: useJgrantsApi ? "jGrants API was called but returned no items (or all were filtered out)." : undefined } }
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  const incomingApiIds = new Set(incoming.map((s) => s.api_id))
  const { data: existingRows, error: fetchError } = await supabase
    .from("subsidies")
    .select("id, api_id, name, description, deadline, status, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting")
    .in("api_id", [...incomingApiIds])
  if (fetchError) {
    emit({ phase: "error", error: fetchError.message })
    return { status: 500, body: { error: "Fetch existing failed", detail: fetchError.message } }
  }

  const existingByApiId = new Map<string, ExistingRow>()
  for (const row of existingRows ?? []) {
    if (row.api_id) existingByApiId.set(row.api_id, row as ExistingRow)
  }
  let newCount = 0
  let needsReviewCount = 0
  const rows = incoming.map((s) => {
    const existing = existingByApiId.get(s.api_id)
    const descNorm = normalizeText(s.description)
    const deadlineNorm = normalizeDeadline(s.deadline)
    if (!existing) {
      newCount += 1
      const pageUrl = s.url ?? null
      return {
        api_id: s.api_id,
        name: s.name,
        agency: s.agency ?? null,
        target_industries: s.target_industries ?? null,
        max_amount: s.max_amount ?? null,
        description: s.description ?? null,
        url: pageUrl,
        pdf_url: pageUrl,
        deadline: s.deadline ?? null,
        status: "draft",
        ai_memo: null,
        flags_reviewed: false,
        is_exclusive_to_scrivener: false,
        requires_certified_agency: false,
        has_post_grant_reporting: false,
        is_active: true,
      }
    }
    const prevDesc = normalizeText(existing.description)
    const prevDeadline = normalizeDeadline(existing.deadline)
    const descriptionChanged = prevDesc !== descNorm
    const deadlineOnly = deadlineNorm !== prevDeadline && !descriptionChanged
    if (descriptionChanged) {
      needsReviewCount += 1
      return {
        api_id: s.api_id,
        name: s.name,
        agency: s.agency ?? null,
        target_industries: s.target_industries ?? null,
        max_amount: s.max_amount ?? null,
        description: s.description ?? null,
        url: s.url ?? null,
        deadline: s.deadline ?? null,
        status: "needs_review",
        ai_memo: "要件テキストの更新を検知しました",
        flags_reviewed: false,
        is_exclusive_to_scrivener: false,
        requires_certified_agency: false,
        has_post_grant_reporting: false,
        is_active: true,
      }
    }
    if (deadlineOnly) {
      return {
        api_id: s.api_id,
        name: s.name,
        agency: s.agency ?? null,
        target_industries: s.target_industries ?? null,
        max_amount: s.max_amount ?? null,
        description: s.description ?? null,
        url: s.url ?? null,
        deadline: s.deadline ?? null,
        status: existing.status ?? "published",
        ai_memo: null,
        flags_reviewed: existing.flags_reviewed ?? false,
        is_exclusive_to_scrivener: existing.is_exclusive_to_scrivener ?? false,
        requires_certified_agency: existing.requires_certified_agency ?? false,
        has_post_grant_reporting: existing.has_post_grant_reporting ?? false,
        is_active: true,
      }
    }
    return {
      api_id: s.api_id,
      name: s.name,
      agency: s.agency ?? null,
      target_industries: s.target_industries ?? null,
      max_amount: s.max_amount ?? null,
      description: s.description ?? null,
      url: s.url ?? null,
      deadline: s.deadline ?? null,
      status: existing.status ?? undefined,
      ai_memo: null,
      flags_reviewed: existing.flags_reviewed ?? false,
      is_exclusive_to_scrivener: existing.is_exclusive_to_scrivener ?? false,
      requires_certified_agency: existing.requires_certified_agency ?? false,
      has_post_grant_reporting: existing.has_post_grant_reporting ?? false,
      is_active: true,
    }
  })

  emit({ phase: "upsert", message: "DB に反映中...", total: rows.length })
  const { error: upsertError } = await supabase.from("subsidies").upsert(rows, { onConflict: "api_id", ignoreDuplicates: false })
  if (upsertError) {
    emit({ phase: "error", error: upsertError.message })
    return { status: 500, body: { error: "Upsert failed", detail: upsertError.message } }
  }

  const namesInIncoming = new Set(incoming.map((s) => s.name))
  const apiIdsInIncoming = new Set(incoming.map((s) => s.api_id))
  const { data: toArchive } = await supabase.from("subsidies").select("id, name, api_id").not("api_id", "is", null)
  const idsToArchive: string[] = []
  for (const row of toArchive ?? []) {
    if (!row.api_id || !namesInIncoming.has(row.name)) continue
    if (apiIdsInIncoming.has(row.api_id)) continue
    idsToArchive.push(row.id)
  }
  if (idsToArchive.length > 0) {
    await supabase.from("subsidies").update({ status: "archived" }).in("id", idsToArchive)
  }

  const hasNotification = newCount > 0 || needsReviewCount > 0
  const notificationText = `[補助金同期] 完了。新規: ${newCount}件, 要確認(needs_review): ${needsReviewCount}件。総数: ${rows.length}件。`
  const webhookUrl = process.env.ADMIN_WEBHOOK_URL?.trim()
  if (hasNotification && webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: notificationText, new_count: newCount, needs_review_count: needsReviewCount, total_synced: rows.length }),
    }).catch(() => {})
  }
  const lineToken = process.env.ADMIN_LINE_CHANNEL_ACCESS_TOKEN?.trim()
  const lineUserId = process.env.ADMIN_LINE_USER_ID?.trim()
  if (hasNotification && lineToken && lineUserId) {
    fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
      body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text: notificationText }] }),
    }).catch(() => {})
  }
  if (syncStateNextOffset !== null && useJgrantsApi) {
    await supabase.from("cron_sync_state").upsert(
      { key: "subsidies_sync", offset_value: syncStateNextOffset, last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
  }

  const body = {
    message: "Sync completed.",
    count: rows.length,
    new_count: newCount,
    needs_review_count: needsReviewCount,
    archived_count: idsToArchive.length,
    next_offset: syncStateNextOffset ?? undefined,
  }
  return { status: 200, body }
}
