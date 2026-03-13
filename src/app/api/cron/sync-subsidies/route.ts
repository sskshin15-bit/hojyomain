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
  is_active?: boolean | null
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase env vars not set." },
      { status: 500 }
    )
  }

  const jgrantsBase = process.env.JGRANTS_API_BASE_URL?.trim()
  let payload: { subsidies?: IncomingSubsidy[] } = {}
  try {
    const text = await request.text()
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = {}
  }

  let incoming: IncomingSubsidy[] = []
  const useJgrantsApi =
    !!jgrantsBase &&
    (!payload.subsidies ||
      !Array.isArray(payload.subsidies) ||
      payload.subsidies.length === 0)

  if (useJgrantsApi) {
    try {
      const { fetchAllSubsidiesFromJgrants } = await import("@/lib/jgrants")
      const items = await fetchAllSubsidiesFromJgrants()
      incoming = items
        .filter((s) => s.id && (s.title || s.name))
        .map((s) => ({
          api_id: String(s.id),
          name: (s.title || s.name) || "",
          description: s.detail
            ? stripHtml(String(s.detail))
            : s.subsidy_catch_phrase
              ? stripHtml(String(s.subsidy_catch_phrase))
              : null,
          url: s.front_subsidy_detail_page_url
            ? String(s.front_subsidy_detail_page_url)
            : null,
          deadline: s.acceptance_end_datetime
            ? new Date(s.acceptance_end_datetime).toISOString()
            : null,
          agency: null,
          target_industries: null,
          max_amount:
            typeof s.subsidy_max_limit === "number" ? s.subsidy_max_limit : null,
          is_active: true,
        }))
    } catch (e) {
      return NextResponse.json(
        {
          error: "jGrants fetch failed",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      )
    }
  } else {
    const raw = payload.subsidies
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        {
          message: "No subsidies to sync.",
          hint: !jgrantsBase
            ? "Set JGRANTS_API_BASE_URL in .env.local and restart the dev server to sync from jGrants API."
            : "Provide a JSON body with 'subsidies' array, or leave body empty to use jGrants.",
        },
        { status: 200 }
      )
    }
    incoming = raw.map((s) => ({
      ...s,
      description: s.description ? stripHtml(s.description) : s.description,
    }))
  }

  if (incoming.length === 0) {
    return NextResponse.json(
      {
        message: "No subsidies to sync.",
        hint: useJgrantsApi
          ? "jGrants API was called but returned no items (or all were filtered out). Check keyword/params in src/lib/jgrants.ts."
          : undefined,
      },
      { status: 200 }
    )
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const rows = incoming.map((s) => ({
    api_id: s.api_id,
    name: s.name,
    agency: s.agency ?? null,
    target_industries: s.target_industries ?? null,
    max_amount: s.max_amount ?? null,
    description: s.description ?? null,
    url: s.url ?? null,
    deadline: s.deadline ? new Date(s.deadline).toISOString() : null,
    is_active: s.is_active ?? true,
  }))

  const { error } = await supabase.from("subsidies").upsert(rows, {
    onConflict: "api_id",
  })

  if (error) {
    return NextResponse.json(
      { error: "Upsert failed", detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { message: "Sync completed.", count: rows.length },
    { status: 200 }
  )
}
