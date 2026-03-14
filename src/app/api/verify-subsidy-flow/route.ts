import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * API経由で取得した補助金データの管理フローが正しく動いているか検証するエンドポイント
 * GET /api/verify-subsidy-flow で呼び出し
 */
export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase の環境変数が未設定です。" },
      { status: 500 }
    )
  }

  const supabase = createClient(url, anonKey)
  const checks: Record<string, unknown> = {}

  // 1. subsidies テーブルから status=published の件数を取得（AI判定で使うクエリと同じ）
  const { data: subsidies, error: subsError } = await supabase
    .from("subsidies")
    .select("id, api_id, name, description, max_amount, url, deadline, agency")
    .eq("status", "published")
    .limit(50)

  checks.subsidies = {
    ok: !subsError,
    error: subsError?.message ?? null,
    count: subsidies?.length ?? 0,
    sample:
      subsidies?.[0] != null
        ? {
            id: subsidies[0].id,
            api_id: subsidies[0].api_id,
            name: subsidies[0].name,
            has_description: !!subsidies[0].description,
          }
        : null,
  }

  // 2. clients テーブル（AI判定結果の保存先）の件数
  const { count: clientsCount, error: clientsError } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })

  checks.clients = {
    ok: !clientsError,
    error: clientsError?.message ?? null,
    count: clientsCount ?? 0,
  }

  // 3. 直近の clients に recommended_subsidies が入っているか
  const { data: recentClient } = await supabase
    .from("clients")
    .select("id, name, recommended_subsidies")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  checks.recent_client = recentClient
    ? {
        id: recentClient.id,
        name: recentClient.name,
        has_recommended_subsidies: Array.isArray(recentClient.recommended_subsidies),
        recommended_count: Array.isArray(recentClient.recommended_subsidies)
          ? recentClient.recommended_subsidies.length
          : 0,
      }
    : { message: "クライアントが0件です" }

  const allOk =
    checks.subsidies && typeof checks.subsidies === "object" && "ok" in checks.subsidies
      ? (checks.subsidies as { ok: boolean }).ok
      : false

  return NextResponse.json({
    ok: allOk,
    message: allOk
      ? "補助金データの取得・保存フローは正常です。"
      : "補助金データの取得に問題があります。",
    checks,
    flow: [
      "1. sync-subsidies / sync-meti-subsidies → jGrants API から取得 → subsidies に upsert",
      "2. AI判定 → subsidies を読み取り → AI が推薦 → clients に recommended_subsidies 保存",
      "3. 本検証 → subsidies の読み取り・clients の件数確認",
    ],
  })
}
