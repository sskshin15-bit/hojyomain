"use client"

import { useState } from "react"
import {
  Banknote,
  Wallet,
  Briefcase,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const kpiData = [
  {
    title: "今月の獲得予定報酬",
    value: "¥850,000",
    icon: Banknote,
    highlight: true,
  },
  {
    title: "累計獲得報酬",
    value: "¥3,200,000",
    icon: Wallet,
    highlight: false,
  },
  {
    title: "進行中の丸投げ案件",
    value: "5件",
    icon: Briefcase,
    highlight: false,
  },
]

const referralData = [
  {
    id: 1,
    client: "株式会社ヤマダ",
    subsidy: "IT導入補助金",
    status: "契約締結・入金待ち",
    statusColor: "emerald",
    expectedFee: "¥300,000",
    actionType: "detail",
  },
  {
    id: 2,
    client: "鈴木建設",
    subsidy: "ものづくり補助金",
    status: "初回面談設定済",
    statusColor: "amber",
    expectedFee: "¥550,000",
    actionType: "detail",
  },
  {
    id: 3,
    client: "佐藤デザイン",
    subsidy: "小規模事業者持続化",
    status: "コンサル選定中",
    statusColor: "sky",
    expectedFee: "未定",
    actionType: "search",
  },
]

const statusColorMap: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
}

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const inviteLink = "https://app.hojokin-cloud.jp/invite/yt80k_xyz"

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            コンサル紹介・報酬管理
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            提携コンサルタントへの丸投げ案件の進捗と、獲得予定の紹介報酬（キックバック）を管理します。
          </p>
        </div>

        {/* Section 1: Financial KPI Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card
                key={kpi.title}
                className={`border-slate-200 bg-white shadow-sm ${
                  kpi.highlight ? "ring-2 ring-emerald-500/20" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        {kpi.title}
                      </p>
                      <p
                        className={`text-2xl font-bold tracking-tight ${
                          kpi.highlight ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        kpi.highlight
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Section 2: Active Referrals Data Table */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">
              紹介案件のステータス
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    顧問先名
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    該当補助金
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    ステータス
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    見込報酬額
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    アクション
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralData.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-slate-100 hover:bg-slate-50/50"
                  >
                    <TableCell className="py-4 font-medium text-slate-900">
                      {row.client}
                    </TableCell>
                    <TableCell className="py-4 text-slate-600">
                      {row.subsidy}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={`${statusColorMap[row.statusColor]} border font-medium`}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right font-semibold text-slate-900">
                      {row.expectedFee}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {row.actionType === "detail" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          詳細
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 bg-slate-900 text-white hover:bg-slate-800"
                        >
                          コンサルを探す
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: SaaS Affiliate Program */}
        <Card className="border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  同業の税理士を紹介して、月額利用料を永年割引
                </h3>
                <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                  先生の専用招待リンク経由で他の税理士事務所が本システムに登録すると、月額利用料の20%を毎月還元いたします。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 lg:w-80">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="h-10 border-slate-600 bg-slate-800/50 pr-10 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-emerald-500"
                  />
                  <ExternalLink className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                <Button
                  onClick={handleCopy}
                  className={`h-10 min-w-[100px] ${
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
