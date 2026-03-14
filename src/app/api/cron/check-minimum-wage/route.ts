import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/** 管理者宛通知（Slack Webhook 等に差し替え可） */
function notifyAdmin(message: string, condition: string): void {
  console.log(`[check-minimum-wage] 管理者通知 (条件${condition}): ${message}`)
}

export const maxDuration = 30

/**
 * 管理者向け：最低賃金マスターデータ更新漏れを検知する Cron ジョブ
 * 3段階アラート（8/1, 9/15 or 9/25, 10/1）
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get("authorization")
  const vercelCron = request.headers.get("x-vercel-cron")
  const cronKey = request.headers.get("x-cron-key")
  const providedKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cronKey

  if (providedKey !== cronSecret && vercelCron !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 500 }
    )
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()

  let message: string | null = null
  let condition: "A" | "B" | "C" | null = null

  if (month === 8 && day === 1) {
    condition = "A"
    message =
      "📢 今年の最低賃金発表時期です。マスターデータの予約入力を行ってください。"
  } else if (
    month === 9 &&
    (day === 15 || day === 25)
  ) {
    condition = "B"
    const oct1 = new Date(Date.UTC(year, 9, 1, 0, 0, 0, 0)).toISOString()
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const { count, error } = await supabase
      .from("minimum_wages")
      .select("*", { count: "exact", head: true })
      .gte("effective_date", oct1)

    if (error) {
      console.error("[check-minimum-wage] DB error:", error)
      message = `⚠️ 最低賃金チェック中にDBエラー: ${error.message}`
    } else if (count === 0) {
      message =
        "⚠️ 【緊急警告】10月からの最低賃金データが未登録です！切り替え期限が迫っています。"
    }
  } else if (month === 10 && day === 1) {
    condition = "C"
    message =
      "✅ 本日から新しい最低賃金の適用が順次開始されます。システムの挙動を確認してください。"
  }

  if (message) {
    notifyAdmin(message, condition!)
  }

  return NextResponse.json({
    ok: true,
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    condition: condition ?? "none",
    notified: !!message,
    message: message ?? "本日は通知対象外の日付です。",
  })
}
