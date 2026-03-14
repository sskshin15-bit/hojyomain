"use server"

import { createClient } from "@supabase/supabase-js"
import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const consultingGuideSchema = z.object({
  key_evaluation_points: z.array(z.string()),
  drafting_tips: z.string(),
})

const aiInferredWarningsSchema = z.object({
  is_exclusive_to_scrivener: z.boolean(),
  requires_certified_agency: z.boolean(),
  has_post_grant_reporting: z.boolean(),
})

const recommendedItemSchema = z.object({
  subsidy_id: z.string(),
  name: z.string(),
  match_rate: z.number(),
  reason: z.string(),
  missing_requirements: z.array(z.string()),
  actionable_advice: z.string(),
  next_question_to_ask: z.string(),
  consulting_guide: consultingGuideSchema,
  ai_inferred_warnings: aiInferredWarningsSchema,
})

const screeningOutputSchema = z.object({
  recommended: z.array(recommendedItemSchema),
})

export type ScreeningRecommendedItem = z.infer<typeof recommendedItemSchema> & {
  db_url?: string | null
  db_flags_reviewed?: boolean | null
  db_is_exclusive_to_scrivener?: boolean | null
  db_requires_certified_agency?: boolean | null
  db_has_post_grant_reporting?: boolean | null
}

export type ScreeningResult = {
  recommended: ScreeningRecommendedItem[]
}

type ScreeningInput = {
  companyName: string
  industry: string
  employees: string
  capital: string
}

export async function runScreening(
  input: ScreeningInput
): Promise<{ ok: true; data: ScreeningResult; clientId?: string } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!url || !anonKey) {
    return { ok: false, error: "Supabase の設定がありません。" }
  }
  if (!openaiKey) {
    return { ok: false, error: "OPENAI_API_KEY が設定されていません。" }
  }

  const supabase = createClient(url, anonKey)
  const { data: subsidies, error: subsError } = await supabase
    .from("subsidies")
    .select("id, name, description, max_amount, url, deadline, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting")
    .eq("status", "published")
    .limit(50)

  if (subsError) {
    return { ok: false, error: `補助金データの取得に失敗しました: ${subsError.message}` }
  }
  if (!subsidies?.length) {
    return { ok: false, error: "対象の補助金が登録されていません。status=published の補助金を登録するか、管理画面で公開してください。" }
  }

  const subsidiesContext = subsidies
    .map(
      (s) =>
        `- ID: ${s.id}, 名前: ${s.name}, 説明: ${(s.description ?? "").slice(0, 400)}, 上限額: ${s.max_amount ?? "不明"}円`
    )
    .join("\n")

  const openai = createOpenAI({ apiKey: openaiKey })
  const prompt = `あなたは税理士向けの補助金アドバイザーです。以下の顧問先情報と、利用可能な補助金一覧（status=published のもののみ）を元に、申請を検討するのに適した補助金を最大3件まで選び、指定のJSON構造で出力してください。

【重要】厳密な法律定義や条文解釈は絶対に生成しないでください。あくまで目安・確認ポイントとして簡潔に記載してください。

顧問先: 企業名=${input.companyName}, 業種=${input.industry}, 従業員数=${input.employees}名, 資本金=${input.capital}万円

補助金一覧:
${subsidiesContext}

出力ルール:
- recommended に最大3件。subsidy_id は上記の ID をそのまま使用。
- match_rate: 0〜100の数値（マッチ度の目安）。
- reason: マッチした理由を短く。
- missing_requirements: 不足している可能性のある要件を文字列配列で（なければ空配列）。
- actionable_advice: 税理士が顧問先に伝えるべきアクション案。
- next_question_to_ask: 顧問先に確認すべき次の質問。
- consulting_guide: key_evaluation_points（審査で見られやすいポイントの文字列配列）, drafting_tips（事業計画等の作成ヒントの文字列）。
- ai_inferred_warnings: 公募要領から推測したフラグ（確定的な法律判断ではなく「要確認」レベル）。is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting を boolean で。`

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: screeningOutputSchema,
      prompt,
    })

    const rawRecommended = (object.recommended ?? []).slice(0, 3)
    const ids = rawRecommended.map((r) => r.subsidy_id)
    const { data: subsidyRows } = await supabase
      .from("subsidies")
      .select("id, url, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting")
      .in("id", ids)

    const rowMap = new Map(
      (subsidyRows ?? []).map((r) => [
        r.id,
        {
          db_url: r.url,
          db_flags_reviewed: r.flags_reviewed,
          db_is_exclusive_to_scrivener: r.is_exclusive_to_scrivener,
          db_requires_certified_agency: r.requires_certified_agency,
          db_has_post_grant_reporting: r.has_post_grant_reporting,
        },
      ])
    )

    const result: ScreeningResult = {
      recommended: rawRecommended.map((r) => ({
        ...r,
        ...rowMap.get(r.subsidy_id),
      })),
    }

    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: input.companyName,
        industry: input.industry,
        employees: parseInt(input.employees, 10) || null,
        capital: input.capital,
        recommended_subsidies: result.recommended,
      })
      .select("id")
      .single()

    if (clientError) {
      console.warn("[runScreening] Client save failed:", clientError.message)
    }

    return {
      ok: true,
      data: result,
      clientId: clientRow?.id,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `AI判定中にエラーが発生しました: ${msg}` }
  }
}
