/**
 * Cron: deprecated チャンクをアーカイブへ移送（コールドストレージ）
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const DEFAULT_DEPRECATED_DAYS = 30

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  let days = DEFAULT_DEPRECATED_DAYS
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.deprecated_days === "number") days = body.deprecated_days
  } catch {
    // ignore
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase.rpc("archive_deprecated_chunks", {
    deprecated_days: days,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ archived: data ?? 0 })
}
