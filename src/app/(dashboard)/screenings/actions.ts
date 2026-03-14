"use server"

import { createClient } from "@supabase/supabase-js"

export async function getGlossariesForTooltip(): Promise<Record<string, string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return {}
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data } = await supabase.from("glossaries").select("term, user_tooltip").order("term")
  if (!data?.length) return {}
  return Object.fromEntries(data.map((r) => [r.term, r.user_tooltip ?? ""]))
}
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
  confidence_score: z.number().min(0).max(100),
  needs_human_help: z.boolean(),
  help_reason: z.string(),
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
  db_adoption_rate?: string | null
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

type SubsidyRow = {
  id: string
  name: string
  description: string | null
  max_amount: number | null
  target_industries?: string[] | null
  agency?: string | null
  structured_requirements?: {
    max_employees?: number | null
    min_employees?: number | null
    max_capital?: number | null
    min_capital?: number | null
    excluded_industries?: string[]
  } | null
  structured_summary?: {
    requirements?: string[]
    screening_criteria?: string[]
    exceptions?: string[]
    other?: string[]
    uncertain?: string[]
  } | null
  [key: string]: unknown
}

function filterByStructuredRequirements(
  rows: SubsidyRow[],
  client: { industry: string; employees: number; capitalYen: number }
): SubsidyRow[] {
  return rows.filter((row) => {
    const sr = row.structured_requirements
    if (!sr || typeof sr !== "object") return true

    if (sr.max_employees != null && client.employees > sr.max_employees) return false
    if (sr.min_employees != null && client.employees < sr.min_employees) return false
    if (sr.max_capital != null && client.capitalYen > sr.max_capital) return false
    if (sr.min_capital != null && client.capitalYen < sr.min_capital) return false

    const excluded = sr.excluded_industries
    if (excluded && Array.isArray(excluded) && excluded.length > 0 && client.industry.trim()) {
      const ci = client.industry.trim().toLowerCase()
      const match = excluded.some((ex) => {
        const e = String(ex).trim().toLowerCase()
        return ci.includes(e) || e.includes(ci)
      })
      if (match) return false
    }
    return true
  })
}

function preFilterSubsidies(
  rows: SubsidyRow[],
  client: { industry: string; employees: number; capital: number }
): SubsidyRow[] {
  return rows.filter((row) => {
    const industries = row.target_industries
    if (!industries || !Array.isArray(industries) || industries.length === 0) return true
    if (industries.some((s) => String(s).includes("全業種"))) return true
    const clientIndustry = client.industry.trim()
    if (!clientIndustry) return true
    return industries.some((s) => {
      const t = String(s).trim()
      return t === clientIndustry || clientIndustry.includes(t) || t.includes(clientIndustry)
    })
  })
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
  const { data: allSubsidies, error: subsError } = await supabase
    .from("subsidies")
    .select("id, name, description, max_amount, url, deadline, target_industries, agency, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting, structured_requirements, structured_summary")
    .eq("status", "published")
    .limit(100)

  if (subsError) {
    return { ok: false, error: `補助金データの取得に失敗しました: ${subsError.message}` }
  }
  if (!allSubsidies?.length) {
    return { ok: false, error: "対象の補助金が登録されていません。status=published の補助金を登録するか、管理画面で公開してください。" }
  }

  const clientEmployees = parseInt(input.employees, 10) || 0
  const clientCapitalYen = (parseInt(input.capital, 10) || 0) * 10000

  const industryFiltered = preFilterSubsidies(allSubsidies, {
    industry: input.industry,
    employees: clientEmployees,
    capital: clientCapitalYen / 10000,
  })
  const preFiltered = filterByStructuredRequirements(industryFiltered, {
    industry: input.industry,
    employees: clientEmployees,
    capitalYen: clientCapitalYen,
  })

  const sorted = [...preFiltered].sort((a, b) => {
    const am = a.max_amount ?? 0
    const bm = b.max_amount ?? 0
    return bm - am
  })

  const subsidies = sorted.slice(0, 8)

  const formatStructuredSummary = (ss: SubsidyRow["structured_summary"]): string => {
    if (!ss || typeof ss !== "object") return ""
    const parts: string[] = []
    if (ss.requirements?.length) {
      parts.push(`受給要件: ${ss.requirements.join(" / ")}`)
    }
    if (ss.screening_criteria?.length) {
      parts.push(`審査基準: ${ss.screening_criteria.join(" / ")}`)
    }
    if (ss.exceptions?.length) {
      parts.push(`除外・例外: ${ss.exceptions.join(" / ")}`)
    }
    if (ss.other?.length) {
      parts.push(`その他: ${ss.other.join(" / ")}`)
    }
    if (ss.uncertain?.length) {
      parts.push(`要確認: ${ss.uncertain.join(" / ")}`)
    }
    return parts.length ? `[構造化] ${parts.join(" | ")}` : ""
  }

  const subsidiesContext = subsidies
    .map((s) => {
      const base = `ID: ${s.id}, 名前: ${s.name}, 説明: ${(s.description ?? "").slice(0, 400)}, 上限額: ${s.max_amount ?? "不明"}円`
      const structured = formatStructuredSummary(s.structured_summary)
      return `- ${base}${structured ? ` ${structured}` : ""}`
    })
    .join("\n")

  const openai = createOpenAI({ apiKey: openaiKey })
  const prompt = `あなたは税理士向けの補助金アドバイザーです。以下の顧問先情報と、利用可能な補助金一覧（status=published のもののみ）を元に、申請を検討するのに適した補助金を最大3件まで選び、指定のJSON構造で出力してください。

補助金の [構造化] 欄がある場合、それは管理画面で人間が確認・修正した受給要件・審査基準・除外条件等です。説明より優先してマッチングの判断に活用してください。

【重要】厳密な法律定義や条文解釈は絶対に生成しないでください。reason・actionable_advice等は簡潔に。consulting_guide（key_evaluation_points, drafting_tips）は文字数制限を気にせず、確認すべき要件・審査ポイント・作成のヒントを漏れなく十分に出力してください。

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
- consulting_guide: 顧問先向け事業計画策定コンサルシート用。key_evaluation_points（審査で見られやすいポイント・確認すべき要件を漏れなく文字列配列で。各項目には可能な限り「公募要領の第〇章〇ページに記載の通り〜」といった根拠となる出典（章・ページ数）を明記すること。根拠が不明な場合は断定を避け「要確認」等と記載）, drafting_tips（事業計画等の作成ヒント。同様に出典・ページ数を含め、根拠がない場合は断定を避ける）。根拠なき断定は絶対に禁止。
- ai_inferred_warnings: 公募要領から推測したフラグ（確定的な法律判断ではなく「要確認」レベル）。is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting を boolean で。
- confidence_score: 0〜100の数値。この推奨の確信度。不明点があれば低く。
- needs_human_help: 専門家の確認が必要な場合 true（曖昧な要件、法律解釈の境界など）。
- help_reason: 迷った理由・懸念点を短く（空文字可）。`

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
      .select("id, url, flags_reviewed, is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting, adoption_rate")
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
          db_adoption_rate: r.adoption_rate,
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

    const snapshotSubsidyData = subsidies.map((s) => ({
      id: s.id,
      name: s.name,
      description: (s.description ?? "").slice(0, 2000),
      max_amount: s.max_amount,
      url: s.url,
      deadline: s.deadline,
    }))

    const needsExpertReview = rawRecommended.some(
      (r) => (r.confidence_score ?? 100) < 80 || r.needs_human_help === true
    )

    await supabase.from("screening_results").insert({
      client_id: clientRow?.id ?? null,
      snapshot_subsidy_data: snapshotSubsidyData,
      snapshot_ai_response: object,
      needs_expert_review: needsExpertReview,
    })

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
