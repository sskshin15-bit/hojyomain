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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, Shield, CheckCircle } from "lucide-react"
import {
  getSubsidyForCheckout,
  getClientsForCheckout,
  createProject,
} from "./actions"

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const subsidyId = params.subsidy_id as string
  const [subsidy, setSubsidy] = useState<{ id: string; name: string; fixed_success_fee_rate: number | null } | null>(null)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [clientId, setClientId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [check3, setCheck3] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getSubsidyForCheckout(subsidyId),
      getClientsForCheckout(),
    ]).then(([subRes, clientsRes]) => {
      setSubsidy(subRes.data)
      setError(subRes.error ?? clientsRes.error)
      setClients(clientsRes.data ?? [])
      if (clientsRes.data?.length && !clientId) {
        setClientId(clientsRes.data[0].id)
      }
      setLoading(false)
    })
  }, [subsidyId])

  const allChecked = check1 && check2 && check3
  const canSubmit = allChecked && clientId && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const res = await createProject(subsidyId, clientId)
    setSubmitting(false)
    if (res.ok) {
      router.push(`/projects/${res.projectId}`)
    } else {
      setSubmitError(res.error ?? "発注に失敗しました")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }
  if (error || !subsidy) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-red-600">{error ?? "補助金が見つかりません"}</p>
        <Link
          href="/screenings"
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          スクリーニングに戻る
        </Link>
      </div>
    )
  }

  const feeRate = subsidy.fixed_success_fee_rate != null
    ? Math.round((subsidy.fixed_success_fee_rate ?? 0) * 100)
    : null

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/screenings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        スクリーニングに戻る
      </Link>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Shield className="h-6 w-6 text-slate-600" />
            専門家への発注（丸投げマッチング）
          </CardTitle>
          <CardDescription className="text-slate-500">
            {subsidy.name}
          </CardDescription>
          <p className="mt-2 text-sm text-slate-600">
            本発注は、お手続きのすべてをオンラインにて完了いただけます。
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 明朗会計表示 */}
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-900">料金（明朗会計）</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              着手金 0円
              {feeRate != null ? (
                <span className="ml-2">/ 成功報酬 {feeRate}%</span>
              ) : (
                <span className="ml-2 text-lg font-normal text-emerald-700">
                  （成功報酬率は補助金ごとに設定）
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              自由価格は一切ありません。システムで固定された料率です。
            </p>
          </div>

          {/* 顧問先選択 */}
          <div className="space-y-2">
            <Label>依頼先（顧問先）</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="顧問先を選択" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clients.length === 0 && (
              <p className="text-sm text-amber-700">
                顧問先が登録されていません。スクリーニングで判定を実行すると顧問先が作成されます。
              </p>
            )}
          </div>

          {/* 必須チェックボックス */}
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50/80 p-4">
            <p className="mb-4 font-medium text-amber-900">
              以下の3つにすべてチェックしないと発注できません
            </p>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={check1}
                  onCheckedChange={(c) => setCheck1(c === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-800">
                  業務委託契約は専門家との直接契約となることを理解しました。
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={check2}
                  onCheckedChange={(c) => setCheck2(c === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-800">
                  本システムおよび紹介元税理士は、合否結果やトラブルに一切の責任を負いません。
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={check3}
                  onCheckedChange={(c) => setCheck3(c === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-800">
                  本依頼は完全成功報酬（不採択時0円）であることを確認しました。
                </span>
              </label>
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <Button
            className="w-full bg-slate-900 text-white hover:bg-slate-800 h-12 text-base font-semibold"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-5 w-5" />
            )}
            発注を確定する
          </Button>
          {!allChecked && (
            <p className="text-center text-xs text-slate-500">
              上記3つのチェックをすべて入れてください
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
