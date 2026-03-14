"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import {
  getSubsidyById,
  completeExpertReview,
  type SubsidyRow,
} from "../actions"
import type { StructuredRequirements } from "@/lib/subsidy-ai-parser"
import { SubsidyStatusBadge } from "@/lib/subsidy-status"

function parseNum(val: string): number | null {
  const n = parseInt(val, 10)
  return Number.isNaN(n) ? null : n
}

function toNumStr(n: number | null | undefined): string {
  return n != null ? String(n) : ""
}

export default function SubsidyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [data, setData] = useState<SubsidyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [sr, setSr] = useState<StructuredRequirements>({})
  const [exclusive, setExclusive] = useState(false)
  const [certified, setCertified] = useState(false)
  const [postReport, setPostReport] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSubsidyById(id).then(({ data: d, error: e }) => {
      setData(d)
      setError(e)
      setLoading(false)
      if (d) {
        const s = (d.structured_requirements ?? {}) as StructuredRequirements
        setSr({
          max_employees: s.max_employees ?? null,
          min_employees: s.min_employees ?? null,
          max_capital: s.max_capital ?? null,
          min_capital: s.min_capital ?? null,
          excluded_industries: s.excluded_industries ?? [],
          included_industries: s.included_industries ?? [],
          requires_black_ink: s.requires_black_ink ?? false,
        })
        const fp = d.ai_proposed_flags
        setExclusive(fp?.is_exclusive_to_scrivener ?? false)
        setCertified(fp?.requires_certified_agency ?? false)
        setPostReport(fp?.has_post_grant_reporting ?? false)
      }
    })
  }, [id])

  const handleCompleteReview = async () => {
    if (!data) return
    setSaving(true)
    setSaveError(null)
    const payload = {
      structured_requirements: { ...sr },
      is_exclusive_to_scrivener: exclusive,
      requires_certified_agency: certified,
      has_post_grant_reporting: postReport,
    }
    const res = await completeExpertReview(id, payload)
    setSaving(false)
    if (res.ok) {
      router.push("/admin/subsidies")
    } else {
      setSaveError(res.error ?? "保存に失敗しました")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-600">{error ?? "補助金が見つかりません"}</p>
        <Link href="/admin/subsidies" className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> 一覧に戻る
        </Link>
      </div>
    )
  }

  const pdfText = data.pdf_raw_text ?? "（PDF未解析）"

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/subsidies"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                一覧に戻る
              </Link>
              <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
              <SubsidyStatusBadge status={data.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左: 原本ソース */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                原本ソース（PDF抽出テキスト）
              </CardTitle>
              <CardDescription className="text-slate-500">
                根拠となる公募要領のテキスト
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="max-h-[70vh] overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap"
                style={{ fontFamily: "ui-monospace, monospace" }}
              >
                {pdfText}
              </div>
            </CardContent>
          </Card>

          {/* 右: AI抽出結果と編集フォーム */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                AI抽出結果・専門家編集
              </CardTitle>
              <CardDescription className="text-slate-500">
                数値を修正し、フラグを確認してから公開
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.ai_update_summary && (
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    変更点の要約
                  </p>
                  <p className="mt-2 text-sm text-amber-900">{data.ai_update_summary}</p>
                </div>
              )}

              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-sm font-medium text-slate-700">構造化要件（編集可）</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">従業員数上限</Label>
                    <Input
                      type="number"
                      value={toNumStr(sr.max_employees)}
                      onChange={(e) =>
                        setSr((s) => ({ ...s, max_employees: parseNum(e.target.value) }))
                      }
                      placeholder="未指定"
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">従業員数下限</Label>
                    <Input
                      type="number"
                      value={toNumStr(sr.min_employees)}
                      onChange={(e) =>
                        setSr((s) => ({ ...s, min_employees: parseNum(e.target.value) }))
                      }
                      placeholder="未指定"
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">資本金上限（円）</Label>
                    <Input
                      type="number"
                      value={toNumStr(sr.max_capital)}
                      onChange={(e) =>
                        setSr((s) => ({ ...s, max_capital: parseNum(e.target.value) }))
                      }
                      placeholder="未指定"
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">資本金下限（円）</Label>
                    <Input
                      type="number"
                      value={toNumStr(sr.min_capital)}
                      onChange={(e) =>
                        setSr((s) => ({ ...s, min_capital: parseNum(e.target.value) }))
                      }
                      placeholder="未指定"
                      className="border-slate-200"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs text-slate-600">除外業種（カンマ区切り）</Label>
                    <Input
                      value={Array.isArray(sr.excluded_industries) ? sr.excluded_industries.join(", ") : ""}
                      onChange={(e) =>
                        setSr((s) => ({
                          ...s,
                          excluded_industries: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="風俗営業, 等"
                      className="border-slate-200"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox
                      id="black-ink"
                      checked={sr.requires_black_ink ?? false}
                      onCheckedChange={(c) =>
                        setSr((s) => ({ ...s, requires_black_ink: c === true }))
                      }
                    />
                    <Label htmlFor="black-ink" className="text-sm text-slate-700 cursor-pointer">
                      黒インク要件あり
                    </Label>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                <p className="mb-3 text-sm font-medium text-amber-900">警告フラグ（AI判定箇所）</p>
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={exclusive} onCheckedChange={(c) => setExclusive(c === true)} />
                      <span className="text-sm text-slate-700">行政書士等の独占業務に該当する恐れ</span>
                    </label>
                    {data.ai_proposed_flags?.is_exclusive_to_scrivener_citation && (
                      <p className="ml-6 mt-0.5 rounded bg-amber-100/80 px-2 py-1 text-xs text-amber-900">
                        根拠: 「{data.ai_proposed_flags.is_exclusive_to_scrivener_citation}」
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={certified} onCheckedChange={(c) => setCertified(c === true)} />
                      <span className="text-sm text-slate-700">認定支援機関必須</span>
                    </label>
                    {data.ai_proposed_flags?.requires_certified_agency_citation && (
                      <p className="ml-6 mt-0.5 rounded bg-amber-100/80 px-2 py-1 text-xs text-amber-900">
                        根拠: 「{data.ai_proposed_flags.requires_certified_agency_citation}」
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={postReport} onCheckedChange={(c) => setPostReport(c === true)} />
                      <span className="text-sm text-slate-700">事後報告義務あり</span>
                    </label>
                    {data.ai_proposed_flags?.has_post_grant_reporting_citation && (
                      <p className="ml-6 mt-0.5 rounded bg-amber-100/80 px-2 py-1 text-xs text-amber-900">
                        根拠: 「{data.ai_proposed_flags.has_post_grant_reporting_citation}」
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleCompleteReview}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                専門家レビュー完了（公開）
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
