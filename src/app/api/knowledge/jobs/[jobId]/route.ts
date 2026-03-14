/**
 * GET /api/knowledge/jobs/:jobId
 * ジョブ状態取得
 */

import { NextResponse } from "next/server"
import { SupabaseJobRepository } from "@/lib/knowledge/implementations/supabase-job-repository"

const jobRepo = new SupabaseJobRepository()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = await jobRepo.getById(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }
  return NextResponse.json({
    job_id: job.job_id,
    status: job.status,
    current_step: job.current_step,
    result_data: job.result_data,
    retry_count: job.retry_count,
    error_message: job.error_message,
    created_at: job.created_at,
    updated_at: job.updated_at,
  })
}
