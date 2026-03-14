/**
 * POST /api/knowledge/jobs
 * ジョブ作成 → HTTP 202 + job_id を即座に返却
 */

import { NextResponse } from "next/server"
import { SupabaseJobRepository } from "@/lib/knowledge/implementations/supabase-job-repository"

const jobRepo = new SupabaseJobRepository()

export async function POST(request: Request) {
  try {
    let body: { input_data?: Record<string, unknown> } = {}
    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      body = await request.json()
    }
    const input_data = body.input_data ?? {}
    const { job_id } = await jobRepo.create({ input_data })
    return NextResponse.json({ job_id }, { status: 202 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
