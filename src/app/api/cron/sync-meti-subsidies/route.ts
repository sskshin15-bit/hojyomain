import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { stripHtml } from "@/lib/html-clean"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  const cronKey = request.headers.get("x-cron-key")
  const providedKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronKey
  if (providedKey !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase env vars not set." }, { status: 500 })
  }

  const jgrantsBase = process.env.JGRANTS_API_BASE_URL?.trim()
  if (!jgrantsBase) {
    return NextResponse.json(
      { message: "No METI subsidies to sync.", hint: "Set JGRANTS_API_BASE_URL in env and restart." },
      { status: 200 }
    )
  }

  try {
    const { fetchMetiSubsidiesFromJgrants } = await import("@/lib/jgrants")
    const items = await fetchMetiSubsidiesFromJgrants()
    const incoming = items
      .filter((s) => s.id && (s.title || s.name))
      .map((s) => ({
        api_id: String(s.id),
        name: (s.title || s.name) || "",
        description: s.detail
          ? stripHtml(String(s.detail))
          : s.subsidy_catch_phrase
            ? stripHtml(String(s.subsidy_catch_phrase))
            : null,
        url: s.front_subsidy_detail_page_url ? String(s.front_subsidy_detail_page_url) : null,
        deadline: s.acceptance_end_datetime
          ? new Date(s.acceptance_end_datetime).toISOString()
          : null,
        agency: "経済産業省" as const,
        target_industries: null,
        max_amount: typeof s.subsidy_max_limit === "number" ? s.subsidy_max_limit : null,
        is_active: true,
      }))
      .filter((s) => s.api_id && s.name)

    if (incoming.length === 0) {
      return NextResponse.json(
        {
          message: "No METI subsidies to sync.",
          hint: "jGrants returned no items for METI keywords (IT導入, ものづくり, 小規模事業者, 経済産業, 生産性向上).",
        },
        { status: 200 }
      )
    }

    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    const rows = incoming.map((s) => ({
      api_id: s.api_id,
      name: s.name,
      agency: s.agency,
      target_industries: s.target_industries,
      max_amount: s.max_amount,
      description: s.description,
      url: s.url,
      deadline: s.deadline,
      is_active: s.is_active,
      status: "draft",
      flags_reviewed: false,
      is_exclusive_to_scrivener: false,
      requires_certified_agency: false,
      has_post_grant_reporting: false,
    }))

    const { error } = await supabase.from("subsidies").upsert(rows, { onConflict: "api_id" })
    if (error) {
      return NextResponse.json(
        { error: "Upsert failed", detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "METI subsidies sync completed.", count: rows.length },
      { status: 200 }
    )
  } catch (e) {
    return NextResponse.json(
      {
        error: "METI subsidies fetch failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    )
  }
}
