"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Coins,
  Briefcase,
  ChevronDown,
  Loader2,
  BookOpen,
  FileSpreadsheet,
  Send,
  TrendingUp,
} from "lucide-react"
import { runScreening, getGlossariesForTooltip, type ScreeningResult, type ScreeningRecommendedItem } from "./actions"
import { GlossaryText } from "./judgment/GlossaryText"
import { QuantitativeSimulator } from "./QuantitativeSimulator"

/** 全角数字を半角に変換し、数字以外を除去 */
function toHalfWidthDigits(value: string): string {
  return value
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, "")
}

function ScreeningCard({ rec, glossary }: { rec: ScreeningRecommendedItem; glossary: Record<string, string> }) {
  const useDbFlags = rec.db_flags_reviewed === true
  const exclusive = useDbFlags ? (rec.db_is_exclusive_to_scrivener ?? false) : (rec.ai_inferred_warnings?.is_exclusive_to_scrivener ?? false)
  const certified = useDbFlags ? (rec.db_requires_certified_agency ?? false) : (rec.ai_inferred_warnings?.requires_certified_agency ?? false)
  const postReport = useDbFlags ? (rec.db_has_post_grant_reporting ?? false) : (rec.ai_inferred_warnings?.has_post_grant_reporting ?? false)
  const hasWarnings = exclusive || certified || postReport
  const guide = rec.consulting_guide
  const needsExpertReview = (rec.confidence_score ?? 100) < 80 || rec.needs_human_help === true

  const adoptionRate = rec.db_adoption_rate?.trim()

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">マッチした補助金</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{rec.name}</h3>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            マッチ率 {rec.match_rate}%
          </Badge>
          {adoptionRate && (
            <Badge
              className="gap-1.5 border-2 border-indigo-400 bg-indigo-100 px-3 py-1.5 text-base font-bold text-indigo-900 shadow-md ring-1 ring-indigo-200"
              variant="outline"
              title="採択率（公募実績から管理者が入力）"
            >
              <TrendingUp className="h-4 w-4" />
              採択率 {adoptionRate}
            </Badge>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-600">
        <GlossaryText text={rec.reason} glossary={glossary} />
      </p>
      {rec.missing_requirements && rec.missing_requirements.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-slate-700">不足しがちな要件の目安</p>
          <ul className="mt-1 list-disc list-inside text-slate-600 space-y-0.5">
            {rec.missing_requirements.map((m, i) => (
              <li key={i}>
                <GlossaryText text={m} glossary={glossary} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-slate-700">
        <span className="font-medium">アクション:</span>{" "}
        <GlossaryText text={rec.actionable_advice} glossary={glossary} />
      </p>
      <p className="text-sm text-slate-600">
        <span className="font-medium">次に確認したい質問:</span>{" "}
        <GlossaryText text={rec.next_question_to_ask} glossary={glossary} />
      </p>

      {needsExpertReview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">専門家確認を推奨</p>
          {(rec.confidence_score ?? 100) < 80 && (
            <p className="mt-1 text-sm text-amber-900">AIの確信度: {rec.confidence_score}%</p>
          )}
          {rec.help_reason && (
            <p className="mt-1 text-sm text-amber-900">{rec.help_reason}</p>
          )}
        </div>
      )}

      {hasWarnings && (
        <div className="flex flex-wrap gap-2">
          {useDbFlags ? (
            <>
              {exclusive && (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  🚨 行政書士法違反の恐れあり
                </Badge>
              )}
              {certified && (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  🚨 認定支援機関必須の可能性
                </Badge>
              )}
              {postReport && (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  🚨 事後報告義務あり
                </Badge>
              )}
            </>
          ) : (
            <>
              {exclusive && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                  ⚠️ AI判定（公式要領要確認）: 行政書士等の独占業務の恐れ
                </Badge>
              )}
              {certified && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                  ⚠️ AI判定（公式要領要確認）: 認定支援機関必須の可能性
                </Badge>
              )}
              {postReport && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                  ⚠️ AI判定（公式要領要確認）: 事後報告義務の可能性
                </Badge>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {rec.db_url && (
          <a
            href={rec.db_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" />
            📖 公式公募要領を確認する
          </a>
        )}
        <Link
          href={`/projects/checkout/${rec.subsidy_id}`}
          className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Send className="h-4 w-4" />
          専門家に依頼する（丸投げ）
        </Link>
      </div>

      <QuantitativeSimulator />

      {guide && (guide.key_evaluation_points?.length > 0 || guide.drafting_tips) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileSpreadsheet className="h-4 w-4" />
            📄 顧問先向け：事業計画策定コンサルティングシート
          </p>
          {guide.key_evaluation_points && guide.key_evaluation_points.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">審査のポイント</p>
              <ul className="mt-1.5 space-y-1">
                {guide.key_evaluation_points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-slate-400">•</span>
                    <GlossaryText text={p} glossary={glossary} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guide.drafting_tips && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">作成のヒント</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                <GlossaryText text={guide.drafting_tips} glossary={glossary} />
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const GATE_CHECK_A = [
  "税金に1円の未納・滞納もない（納税証明書が取得可能）",
  "GビズIDプライムを取得済み、または即時取得予定である",
  "最低賃金をクリアし、社会保険に適法に加入している",
  "今回の申請経費に対して、他の補助金を受給していない（二重受給ではない）",
] as const

const GATE_CHECK_B = [
  "中小企業の規模要件（資本金・従業員数）に合致し、みなし大企業ではない",
  "1期以上の決算・確定申告を終え、事業実態がある",
  "直近で同種の補助金を受給しておらず、クールダウン期間を抜けている（補助金ごとに異なるので要確認）",
  "深刻な債務超過ではない（または解消のための事業計画が立てられる）",
  "【コンプライアンス】対象外業種（風俗営業等）や反社会的勢力に該当しない",
] as const

export default function ScreeningPage() {
  const [gatePassed, setGatePassed] = useState(false)
  const [gateCollapsed, setGateCollapsed] = useState(false)
  const [gateA1, setGateA1] = useState(false)
  const [gateA2, setGateA2] = useState(false)
  const [gateA3, setGateA3] = useState(false)
  const [gateA4, setGateA4] = useState(false)
  const [gateB1, setGateB1] = useState(false)
  const [gateB2, setGateB2] = useState(false)
  const [gateB3, setGateB3] = useState(false)
  const [gateB4, setGateB4] = useState(false)
  const [gateB5, setGateB5] = useState(false)

  const gateAStates = [gateA1, gateA2, gateA3, gateA4]
  const gateBStates = [gateB1, gateB2, gateB3, gateB4, gateB5]
  const allGateChecked = gateAStates.every(Boolean) && gateBStates.every(Boolean)

  const [companyName, setCompanyName] = useState("株式会社サンプルテック")
  const [industry, setIndustry] = useState("it")
  const [employees, setEmployees] = useState("15")
  const [capital, setCapital] = useState("500")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [wagePlan, setWagePlan] = useState("")
  const [recentSettlement, setRecentSettlement] = useState("")
  const [yearsSinceFounded, setYearsSinceFounded] = useState("")
  const [invoiceRegistered, setInvoiceRegistered] = useState(false)
  const [plannedInvestment, setPlannedInvestment] = useState("")
  const [glossary, setGlossary] = useState<Record<string, string>>({})

  useEffect(() => {
    getGlossariesForTooltip().then(setGlossary)
  }, [])

  const industryLabel: Record<string, string> = {
    it: "IT・通信",
    construction: "建設業",
    food: "飲食業",
    manufacturing: "製造業",
    retail: "小売業",
    service: "サービス業",
    medical: "医療・福祉",
  }

  const handleRunScreening = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await runScreening({
        companyName,
        industry: industryLabel[industry] ?? industry,
        employees,
        capital,
      })
      if (res.ok) {
        setResult(res.data)
      } else {
        setError(res.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI 5秒スクリーニング
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            顧問先の基本データを入力し、申請の可能性が高い補助金を候補としてリストアップします。
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* STEP 1: 申請のための絶対条件チェック */}
        <Card className="border-slate-200 bg-white shadow-md">
          {gatePassed && gateCollapsed ? (
            <button
              type="button"
              onClick={() => setGateCollapsed(false)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/80 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">【STEP 1】申請のための絶対条件チェック</h2>
                  <p className="text-sm text-emerald-700 font-medium">すべて満たしています（クリックで展開）</p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-400" />
            </button>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-slate-900">
                  【STEP 1】申請のための絶対条件チェック
                </CardTitle>
                <CardDescription className="text-slate-500">
                  以下の絶対条件をすべて満たしていることを確認してください。1つでも該当しない場合は補助金申請を見送ることを推奨します。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* セクションA: 顧問先へのヒアリング */}
                <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                    🗣️ 顧問先への確認事項（画面を見せながらヒアリング）
                  </h3>
                  <ul className="space-y-3">
                    {GATE_CHECK_A.map((label, i) => (
                      <li key={i}>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <Checkbox
                            checked={gateAStates[i]}
                            onCheckedChange={(c) => {
                              const setters = [setGateA1, setGateA2, setGateA3, setGateA4]
                              setters[i](c === true)
                            }}
                            className="mt-0.5 size-5 border-2 border-slate-500 data-[state=checked]:border-slate-700"
                          />
                          <span className="text-sm text-slate-800 group-hover:text-slate-900">{label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* セクションB: 税理士内部確認 */}
                <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    🕵️‍♂️ 税理士事務所における内部確認項目（顧問先には開示せず、先生のご判断でチェックする項目です）
                  </h3>
                  <ul className="space-y-3">
                    {GATE_CHECK_B.map((label, i) => (
                      <li key={i}>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <Checkbox
                            checked={gateBStates[i]}
                            onCheckedChange={(c) => {
                              const setters = [setGateB1, setGateB2, setGateB3, setGateB4, setGateB5]
                              setters[i](c === true)
                            }}
                            className="mt-0.5 size-5 border-2 border-slate-500 data-[state=checked]:border-slate-700"
                          />
                          <span className="text-sm text-slate-800 group-hover:text-slate-900">{label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full h-14 text-base font-semibold bg-slate-900 hover:bg-slate-800"
                  disabled={!allGateChecked}
                  onClick={() => {
                    setGatePassed(true)
                    setGateCollapsed(true)
                  }}
                >
                  {allGateChecked ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      上記の絶対条件をすべて満たしている（企業データの入力へ進む）
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-5 w-5 opacity-70" />
                      上記9項目をすべてチェックしてください
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        {/* STEP 2: 企業データ入力（gatePassed まで非表示 or グレーアウト） */}
        <div
          className={`grid gap-8 lg:grid-cols-2 transition-opacity duration-300 ${
            !gatePassed ? "opacity-50 pointer-events-none select-none" : ""
          }`}
        >
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Building2 className="h-5 w-5 text-slate-600" />
                顧問先データの入力
              </CardTitle>
              <CardDescription className="text-slate-500">
                基本情報を入力し、申請の可能性が高い補助金を候補としてリストアップします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="text-sm font-medium text-slate-700">
                  企業名
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="company-name"
                    placeholder="株式会社〇〇"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium text-slate-700">
                  業種
                </Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="w-full border-slate-200 focus:border-slate-400 focus:ring-slate-400">
                    <Briefcase className="mr-2 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="業種を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT・通信</SelectItem>
                    <SelectItem value="construction">建設業</SelectItem>
                    <SelectItem value="food">飲食業</SelectItem>
                    <SelectItem value="manufacturing">製造業</SelectItem>
                    <SelectItem value="retail">小売業</SelectItem>
                    <SelectItem value="service">サービス業</SelectItem>
                    <SelectItem value="medical">医療・福祉</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employees" className="text-sm font-medium text-slate-700">
                  従業員数
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="employees"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="15"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400 tabular-nums"
                    value={employees}
                    onChange={(e) => setEmployees(toHalfWidthDigits(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">名</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capital" className="text-sm font-medium text-slate-700">
                  資本金
                </Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="capital"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="500"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400 tabular-nums"
                    value={capital}
                    onChange={(e) => setCapital(toHalfWidthDigits(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">万円</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">投資予定</Label>
                <Select value={plannedInvestment} onValueChange={setPlannedInvestment}>
                  <SelectTrigger className="w-full border-slate-200 focus:border-slate-400 focus:ring-slate-400">
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">あり</SelectItem>
                    <SelectItem value="no">なし</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">賃上げ計画の有無</Label>
                  <Select value={wagePlan} onValueChange={setWagePlan}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">あり</SelectItem>
                      <SelectItem value="no">なし</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">直近の決算状況</Label>
                  <Select value={recentSettlement} onValueChange={setRecentSettlement}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profit">営業黒字</SelectItem>
                      <SelectItem value="loss">赤字</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">創業からの年数</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="3"
                    className="border-slate-200 tabular-nums"
                    value={yearsSinceFounded}
                    onChange={(e) => setYearsSinceFounded(toHalfWidthDigits(e.target.value))}
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="invoice"
                      checked={invoiceRegistered}
                      onCheckedChange={(c) => setInvoiceRegistered(c === true)}
                    />
                    <span className="text-sm font-medium text-slate-700">インボイス登録済み</span>
                  </label>
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-12 text-base font-semibold shadow-sm cursor-pointer"
                onClick={handleRunScreening}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    判定中…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    可能性の高い補助金をリストアップする（無料）
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-600" />
                判定結果・アクションプラン
              </CardTitle>
              <CardDescription className="text-slate-500">
                申請の可能性が高い補助金の候補一覧
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {result && (
                <>
                  {result.recommended.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                      現時点でマッチした補助金はありません。条件を変えて再実行するか、別の補助金を検討してください。
                    </div>
                  ) : (
                    result.recommended.map((rec) => (
                      <ScreeningCard key={rec.subsidy_id} rec={rec} glossary={glossary} />
                    ))
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirm"
                        checked={confirmed}
                        onCheckedChange={(c) => setConfirmed(c as boolean)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="confirm" className="text-sm leading-relaxed text-slate-700 cursor-pointer">
                        リストアップ結果および要件を税理士として最終確認しました
                      </Label>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!confirmed}
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    提案用ロードマップを出力（PDF/Web）
                  </Button>
                </>
              )}

              {!result && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-slate-100 p-4">
                    <Sparkles className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    左側のフォームに顧問先データを入力し、
                    <br />
                    「可能性の高い補助金をリストアップする」をクリックしてください
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 py-3 px-4 text-center text-sm text-slate-600">
          リストアップ結果は目安です。要件の詳細は必ず一次情報をご確認ください。
        </div>
      )}
    </div>
  )
}
