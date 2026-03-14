/**
 * 管理画面から同期・リンク先取得を実行（AbortSignal 対応で中断可能）
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const CRON_BASE = process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  `http://localhost:${process.env.PORT || 3000}`

export const maxDuration = 300

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }

  let body: { type?: string; subsidy_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const type = body.type === "fetch-link-sources" ? "fetch-link-sources" : "sync-subsidies"
  const url = type === "fetch-link-sources"
    ? `${CRON_BASE}/api/cron/fetch-link-sources`
    : `${CRON_BASE}/api/cron/sync-subsidies`

  const fetchBody = type === "fetch-link-sources" && body.subsidy_id
    ? JSON.stringify({ subsidy_id: body.subsidy_id })
    : "{}"

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
        "X-Stream-Progress": "1",
      },
      body: fetchBody,
      signal: request.signal,
      cache: "no-store",
    })
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/x-ndjson") && res.body) {
      return new Response(res.body, {
        status: res.status,
        headers: { "Content-Type": "application/x-ndjson" },
      })
    }
    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return NextResponse.json({ error: "中断されました", aborted: true }, { status: 499 })
    }
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
