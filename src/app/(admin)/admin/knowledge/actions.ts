"use server"

import { createClient } from "@supabase/supabase-js"

export type KnowledgeJobRow = {
  job_id: string
  status: string
  current_step: string
  input_data: Record<string, unknown>
  result_data: Record<string, unknown> | null
  retry_count: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export type DlqJobRow = {
  id: string
  original_job_id: string
  failed_at: string
  error_message: string | null
  input_data: Record<string, unknown> | null
}

export type KnowledgeChunkRow = {
  id: string
  content: string
  content_hash: string
  source: string
  status: string
  summary: string | null
  keywords: string[] | null
  created_at: string
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase not configured")
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getKnowledgeJobs(filters?: {
  status?: string
}): Promise<{ data: KnowledgeJobRow[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    let q = supabase
      .from("knowledge_jobs")
      .select("job_id, status, current_step, input_data, result_data, retry_count, error_message, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100)
    if (filters?.status && filters.status !== "all") {
      q = q.eq("status", filters.status)
    }
    const { data, error } = await q
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []) as KnowledgeJobRow[], error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getDlqJobs(): Promise<{ data: DlqJobRow[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("dlq_jobs")
      .select("id, original_job_id, failed_at, error_message, input_data")
      .order("failed_at", { ascending: false })
      .limit(50)
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []) as DlqJobRow[], error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export type KnowledgeDocumentRow = {
  source: string
  totalChunks: number
  activeChunks: number
}

export async function getKnowledgeDocuments(): Promise<{ data: KnowledgeDocumentRow[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("knowledge_chunks")
      .select("source, status")
    if (error) return { data: [], error: error.message }
    const bySource = (data ?? []).reduce(
      (acc, r) => {
        const s = (r as { source: string; status: string }).source
        if (!s) return acc
        if (!acc[s]) acc[s] = { total: 0, active: 0 }
        acc[s].total++
        if ((r as { status: string }).status === "active") acc[s].active++
        return acc
      },
      {} as Record<string, { total: number; active: number }>
    )
    const list = Object.entries(bySource)
      .map(([source, c]) => ({ source, totalChunks: c.total, activeChunks: c.active }))
      .sort((a, b) => b.totalChunks - a.totalChunks)
    return { data: list, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getKnowledgeSources(): Promise<{ data: string[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("knowledge_chunks")
      .select("source")
    if (error) return { data: [], error: error.message }
    const unique = [...new Set((data ?? []).map((r) => (r as { source: string }).source).filter(Boolean))]
    return { data: unique.sort(), error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getKnowledgeStats(): Promise<{
  data: { docs: number; chunks: number; activeChunks: number; pendingJobs: number }
  error: string | null
}> {
  try {
    const supabase = getSupabase()
    const [sourcesRes, chunksRes, activeRes, pendingRes] = await Promise.all([
      supabase.from("knowledge_chunks").select("source").limit(1000),
      supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }),
      supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("knowledge_jobs").select("job_id", { count: "exact", head: true }).eq("status", "pending"),
    ])
    const docs = new Set((sourcesRes.data ?? []).map((r) => (r as { source: string }).source).filter(Boolean)).size
    return {
      data: {
        docs,
        chunks: chunksRes.count ?? 0,
        activeChunks: activeRes.count ?? 0,
        pendingJobs: pendingRes.count ?? 0,
      },
      error: null,
    }
  } catch (e) {
    return {
      data: { docs: 0, chunks: 0, activeChunks: 0, pendingJobs: 0 },
      error: e instanceof Error ? e.message : String(e) ?? "Unknown error",
    }
  }
}

export async function getKnowledgeChunks(filters?: {
  status?: string
  source?: string
}): Promise<{ data: KnowledgeChunkRow[]; error: string | null }> {
  try {
    const supabase = getSupabase()
    let q = supabase
      .from("knowledge_chunks")
      .select("id, content, content_hash, source, status, summary, keywords, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
    if (filters?.status && filters.status !== "all") {
      q = q.eq("status", filters.status)
    }
    if (filters?.source?.trim()) {
      q = q.ilike("source", `%${filters.source}%`)
    }
    const { data, error } = await q
    if (error) return { data: [], error: error.message }
    return { data: (data ?? []) as KnowledgeChunkRow[], error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : String(e) }
  }
}

export async function createKnowledgeJob(
  pdfUrl: string,
  query?: string
): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  try {
    const { SupabaseJobRepository } = await import("@/lib/knowledge/implementations/supabase-job-repository")
    const repo = new SupabaseJobRepository()
    const input_data: Record<string, unknown> = { pdf_url: pdfUrl }
    if (query?.trim()) input_data.query = query.trim()
    const { job_id } = await repo.create({ input_data })
    return { ok: true, jobId: job_id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function triggerKnowledgeWorker(): Promise<{ ok: boolean; processed?: number; error?: string }> {
  try {
    const { SupabaseJobRepository } = await import("@/lib/knowledge/implementations/supabase-job-repository")
    const { runWorker } = await import("@/lib/knowledge/state-machine/executor")
    const { createStepHandlers } = await import("@/lib/knowledge/state-machine/handlers")
    const repo = new SupabaseJobRepository()
    const handlers = createStepHandlers()
    let processed = 0
    for (let i = 0; i < 10; i++) {
      const r = await runWorker({ jobRepo: repo, stepHandlers: handlers })
      processed += r.processed
      if (r.processed === 0) break
    }
    return { ok: true, processed }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function runKnowledgeQuery(
  query: string,
  source?: string
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const { runEnsemblePipeline } = await import("@/lib/knowledge/ensemble-pipeline")
    const result = await runEnsemblePipeline({
      query: query.trim(),
      sourceFilter: source?.trim() || undefined,
    })
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function updateChunkStatus(
  id: string,
  status: "active" | "deprecated" | "needs_review"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from("knowledge_chunks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
