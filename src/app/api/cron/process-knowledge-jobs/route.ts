/**
 * Cron: 知識管理ジョブ ワーカー
 * CRON_SECRET で認証。1件ずつ claim してステートマシン実行。DLQ移送含む
 */

import { NextResponse } from "next/server"
import { SupabaseJobRepository } from "@/lib/knowledge/implementations/supabase-job-repository"
import { runWorker } from "@/lib/knowledge/state-machine/executor"
import { stepHandlers } from "@/lib/knowledge/state-machine/handlers"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  const cronKey = request.headers.get("x-cron-key")
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronKey
  if (provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const jobRepo = new SupabaseJobRepository()
  let processed = 0
  const maxPerRun = 10

  for (let i = 0; i < maxPerRun; i++) {
    const result = await runWorker({ jobRepo, stepHandlers })
    processed += result.processed
    if (result.processed === 0) break
  }

  return NextResponse.json({ processed })
}
