"use client"

import {
  Users,
  Sparkles,
  Briefcase,
  Banknote,
  Bell,
  FileText,
  Eye,
  FileOutput,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    title: "管理中の顧問先",
    value: "42社",
    icon: Users,
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
  {
    title: "新規AIマッチング",
    value: "3件",
    icon: Sparkles,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "進行中の丸投げ案件",
    value: "5件",
    icon: Briefcase,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "今月の紹介報酬 (見込)",
    value: "¥850,000",
    icon: Banknote,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    highlight: true,
  },
]

const alertData = [
  {
    company: "株式会社ヤマダ",
    industry: "IT / 15名",
    status: "ready",
    statusLabel: "現状で申請可能 (マッチ度95%)",
    amount: "約150万円",
    action: "提案書を生成",
    actionVariant: "default" as const,
  },
  {
    company: "鈴木建設",
    industry: "建設 / 8名",
    status: "conditional",
    statusLabel: "条件クリアで狙える",
    amount: "約200万円",
    action: "詳細確認",
    actionVariant: "secondary" as const,
  },
  {
    company: "佐藤デザイン",
    industry: "デザイン / 2名",
    status: "risk",
    statusLabel: "申請リスク高 (資本金)",
    amount: "-",
    action: "防衛レポート出力",
    actionVariant: "outline" as const,
  },
]

function StatusBadge({ status, label }: { status: string; label: string }) {
  const statusConfig = {
    ready: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    conditional: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    risk: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      dot: "bg-red-500",
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig]

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {label}
    </span>
  )
}

export default function DashboardPage() {
  return (
    <>
      {/* Welcome Message */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          〇〇先生、お疲れ様です。
        </h2>
        <p className="text-slate-500 mt-1">
          本日のAI監視レポートです。
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi) => (
          <Card
            key={kpi.title}
            className={`bg-white border-slate-200 shadow-sm py-4 ${
              kpi.highlight ? "ring-2 ring-indigo-500/20" : ""
            }`}
          >
            <CardContent className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${kpi.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium">
                  {kpi.title}
                </p>
                <p
                  className={`text-2xl font-bold mt-0.5 ${
                    kpi.highlight ? "text-indigo-600" : "text-slate-900"
                  }`}
                >
                  {kpi.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Data Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base text-slate-900">
                  アクションが必要な顧問先
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  自動監視アラート
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-slate-600">
              <FileText className="w-4 h-4" />
              すべて表示
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wide">
                  企業名
                </TableHead>
                <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wide">
                  業種/規模
                </TableHead>
                <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wide">
                  AI判定結果
                </TableHead>
                <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wide">
                  推定受給額
                </TableHead>
                <TableHead className="text-slate-500 font-medium text-xs uppercase tracking-wide text-right">
                  アクション
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertData.map((row, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-slate-50/50 border-slate-100"
                >
                  <TableCell className="font-medium text-slate-900">
                    {row.company}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {row.industry}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={row.status}
                      label={row.statusLabel}
                    />
                  </TableCell>
                  <TableCell className="text-slate-900 font-semibold">
                    {row.amount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={row.actionVariant}
                      size="sm"
                      className={
                        row.actionVariant === "default"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : row.actionVariant === "secondary"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : ""
                      }
                    >
                      {row.actionVariant === "default" && (
                        <FileText className="w-4 h-4" />
                      )}
                      {row.actionVariant === "secondary" && (
                        <Eye className="w-4 h-4" />
                      )}
                      {row.actionVariant === "outline" && (
                        <FileOutput className="w-4 h-4" />
                      )}
                      {row.action}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
