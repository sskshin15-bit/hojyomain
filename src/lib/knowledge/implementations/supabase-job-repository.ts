/**
 * Supabase による JobRepositoryAdapter 実装
 */

import { createClient } from "@supabase/supabase-js"
import type { KnowledgeJobStatus } from "../schemas"
import type { JobRepositoryAdapter, JobInput, JobRecord } from "../adapters/job-repository"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase env vars not configured")
  return createClient(url, key)
}

function rowToRecord(row: Record<string, unknown>): JobRecord {
  return {
    job_id: row.job_id as string,
    status: row.status as KnowledgeJobStatus,
    current_step: (row.current_step as string) ?? "init",
    input_data: (row.input_data as Record<string, unknown>) ?? {},
    result_data: (row.result_data as Record<string, unknown>) ?? null,
    retry_count: Number(row.retry_count ?? 0),
    max_retries: Number(row.max_retries ?? 3),
    error_message: (row.error_message as string) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  }
}

export class SupabaseJobRepository implements JobRepositoryAdapter {
  async create(input: JobInput): Promise<{ job_id: string }> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("knowledge_jobs")
      .insert({ input_data: input.input_data })
      .select("job_id")
      .single()
    if (error) throw new Error(`Job create failed: ${error.message}`)
    return { job_id: data.job_id }
  }

  async claimNextPending(): Promise<JobRecord | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc("claim_next_knowledge_job")
    if (error) throw new Error(`Claim failed: ${error.message}`)
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null
    return rowToRecord(row)
  }

  async updateStep(
    jobId: string,
    data: {
      current_step: string
      result_data?: Record<string, unknown>
      status?: KnowledgeJobStatus
      error_message?: string | null
    }
  ): Promise<void> {
    const supabase = getSupabase()
    const update: Record<string, unknown> = {
      current_step: data.current_step,
      updated_at: new Date().toISOString(),
    }
    if (data.result_data !== undefined) update.result_data = data.result_data
    if (data.status !== undefined) update.status = data.status
    if (data.error_message !== undefined) update.error_message = data.error_message

    const { error } = await supabase
      .from("knowledge_jobs")
      .update(update)
      .eq("job_id", jobId)
    if (error) throw new Error(`Update step failed: ${error.message}`)
  }

  async incrementRetry(jobId: string): Promise<void> {
    const supabase = getSupabase()
    const { data: job } = await supabase
      .from("knowledge_jobs")
      .select("retry_count")
      .eq("job_id", jobId)
      .single()
    const next = (job?.retry_count ?? 0) + 1
    const { error } = await supabase
      .from("knowledge_jobs")
      .update({ retry_count: next, updated_at: new Date().toISOString() })
      .eq("job_id", jobId)
    if (error) throw new Error(`Increment retry failed: ${error.message}`)
  }

  async getById(jobId: string): Promise<JobRecord | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("knowledge_jobs")
      .select("*")
      .eq("job_id", jobId)
      .single()
    if (error || !data) return null
    return rowToRecord(data)
  }

  async moveToDlq(jobId: string, errorMessage: string): Promise<void> {
    const supabase = getSupabase()
    const job = await this.getById(jobId)
    if (!job) return

    await supabase.from("knowledge_jobs").update({
      status: "dlq",
      updated_at: new Date().toISOString(),
    }).eq("job_id", jobId)

    await supabase.from("dlq_jobs").upsert(
      {
        original_job_id: jobId,
        error_message: errorMessage,
        input_data: job.input_data,
      },
      { onConflict: "original_job_id" }
    )
  }
}
