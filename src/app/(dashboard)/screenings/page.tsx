"use client"

import { useState } from "react"
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
  RefreshCw,
  Loader2,
  BookOpen,
  FileSpreadsheet,
} from "lucide-react"
import { runScreening, type ScreeningResult, type ScreeningRecommendedItem } from "./actions"

function ScreeningCard({ rec }: { rec: ScreeningRecommendedItem }) {
  const useDbFlags = rec.db_flags_reviewed === true
  const exclusive = useDbFlags ? (rec.db_is_exclusive_to_scrivener ?? false) : (rec.ai_inferred_warnings?.is_exclusive_to_scrivener ?? false)
  const certified = useDbFlags ? (rec.db_requires_certified_agency ?? false) : (rec.ai_inferred_warnings?.requires_certified_agency ?? false)
  const postReport = useDbFlags ? (rec.db_has_post_grant_reporting ?? false) : (rec.ai_inferred_warnings?.has_post_grant_reporting ?? false)
  const hasWarnings = exclusive || certified || postReport
  const guide = rec.consulting_guide

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">マッチした補助金</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{rec.name}</h3>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          マッチ率 {rec.match_rate}%
        </Badge>
      </div>
      <p className="text-sm text-slate-600">{rec.reason}</p>
      {rec.missing_requirements && rec.missing_requirements.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-slate-700">不足しがちな要件の目安</p>
          <ul className="mt-1 list-disc list-inside text-slate-600 space-y-0.5">
            {rec.missing_requirements.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-slate-700"><span className="font-medium">アクション:</span> {rec.actionable_advice}</p>
      <p className="text-sm text-slate-600"><span className="font-medium">次に確認したい質問:</span> {rec.next_question_to_ask}</p>

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
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guide.drafting_tips && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">作成のヒント</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{guide.drafting_tips}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ScreeningPage() {
  const [companyName, setCompanyName] = useState("株式会社サンプルテック")
  const [industry, setIndustry] = useState("it")
  const [employees, setEmployees] = useState("15")
  const [capital, setCapital] = useState("500")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [invoiceRegistered, setInvoiceRegistered] = useState(false)

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
            顧問先の基本データを入力し、現状で申請可能な補助金を即座に判定します。
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Building2 className="h-5 w-5 text-slate-600" />
                顧問先データの入力
              </CardTitle>
              <CardDescription className="text-slate-500">
                基本情報を入力して補助金の適格性を判定します
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
                    type="number"
                    placeholder="15"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    value={employees}
                    onChange={(e) => setEmployees(e.target.value)}
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
                    type="number"
                    placeholder="500"
                    className="pl-10 border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">万円</span>
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
                    AIで即時判定する（無料）
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
                AIによる補助金マッチング結果
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
                      <ScreeningCard key={rec.subsidy_id} rec={rec} />
                    ))
                  )}

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setAdvancedOpen(!advancedOpen)}
                      className="flex w-full items-center justify-between p-4 text-left"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        さらに詳細な条件を追加して判定精度を上げる（任意）
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {advancedOpen && (
                      <div className="border-t border-slate-100 p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">賃上げ計画の有無</Label>
                            <Select defaultValue="">
                              <SelectTrigger className="h-9 text-sm border-slate-200">
                                <SelectValue placeholder="選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">あり</SelectItem>
                                <SelectItem value="no">なし</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">直近の決算状況</Label>
                            <Select defaultValue="">
                              <SelectTrigger className="h-9 text-sm border-slate-200">
                                <SelectValue placeholder="選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="profit">営業黒字</SelectItem>
                                <SelectItem value="loss">赤字</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-600">創業からの年数</Label>
                            <Input type="number" placeholder="3" className="h-9 text-sm border-slate-200 pr-8" />
                          </div>
                          <div className="space-y-1.5 flex items-end">
                            <div className="flex gap-2 items-center">
                              <Checkbox
                                id="invoice"
                                checked={invoiceRegistered}
                                onCheckedChange={(c) => setInvoiceRegistered(c as boolean)}
                              />
                              <Label htmlFor="invoice" className="text-sm text-slate-600 cursor-pointer">
                                インボイス登録済み
                              </Label>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="mt-4 w-full h-9 text-sm border-slate-300 text-slate-700 hover:bg-slate-100"
                          onClick={handleRunScreening}
                          disabled={loading}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          判定を再実行する
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirm"
                        checked={confirmed}
                        onCheckedChange={(c) => setConfirmed(c as boolean)}
                        className="mt-0.5"
                      />
                      <Label htmlFor="confirm" className="text-sm leading-relaxed text-slate-700 cursor-pointer">
                        AIの判定結果および要件を税理士として最終確認しました
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
                    「AIで即時判定する」をクリックしてください
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 py-3 px-4 text-center text-sm text-slate-600">
          AIの判定は目安です。要件の詳細は必ず一次情報をご確認ください。
        </div>
      )}
    </div>
  )
}
