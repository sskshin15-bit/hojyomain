"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Filter,
  MessageSquareShare,
  Link2,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  FileText,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type ClientRow = {
  id: string
  name: string
  ceo_name: string | null
  industry: string | null
  employees: number | null
  capital: string | null
  status: string
  created_at: string
}

/** 仮表示（AI連携前）：提案内容は固定文言 */
const PLACEHOLDER_PROPOSAL = "IT導入補助金 (約1,500,000円) - クラウド導入計画"

/** 文面コピー用の制度名（AI連携前は仮。税理士が編集しやすいようテンプレート内で差し替え可能） */
const DEFAULT_PROPOSAL_NAME = "IT導入補助金"

function getStatusBadge(status: string, viewedAt: string | null, viewedBy: string | null) {
  switch (status) {
    case "viewed":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-normal">
          <CheckCircle2 className="mr-1.5 h-3 w-3" />
          {viewedBy}が閲覧済み ({viewedAt})
        </Badge>
      )
    case "unviewed":
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100 font-normal">
          <Clock className="mr-1.5 h-3 w-3" />
          未閲覧
        </Badge>
      )
    case "delegated":
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 font-normal">
          <ArrowUpRight className="mr-1.5 h-3 w-3" />
          コンサルへ丸投げ済
        </Badge>
      )
    default:
      return null
  }
}

const getProposalUrl = (id: string) =>
  `https://hojokin-cloud.pro/proposal/${id}`

const getMessageWithLink = (
  clientName: string,
  ceoName: string | null,
  id: string,
  proposalName: string = DEFAULT_PROPOSAL_NAME
) => {
  const url = getProposalUrl(id)
  const salutation = ceoName?.trim()
    ? `${ceoName.trim()} 社長`
    : `${clientName} 代表取締役様`
  return `${salutation}
いつもお世話になっております。

貴社の状況から活用できそうな補助金をAIでシミュレーションいたしました。
現在のタイミングですと、以下の制度が狙える可能性がございます。

■ 該当の可能性が高い制度：【${proposalName}】
■ 見込み金額：約150万円

申請手続き等は提携の専門チームがサポートするため、貴社のお手間は最小限で進められる体制となっております。

スマホで確認できる簡易診断レポートを作成しましたので、まずは以下のリンクよりご覧ください。
👉 ${url}

内容につきまして、次回の面談（またはお電話）で少しお話しできれば幸いです。
よろしくお願いいたします。`
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, "/")
  } catch {
    return "—"
  }
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchClients() {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("id, name, ceo_name, industry, employees, capital, status, created_at")
        .order("created_at", { ascending: false })

      if (!mounted) return
      if (fetchError) {
        setError(fetchError.message)
        setClients([])
      } else {
        setClients((data ?? []) as ClientRow[])
      }
      setIsLoading(false)
    }
    fetchClients()
    return () => { mounted = false }
  }, [])

  const handleCopyLinkOnly = (id: string) => {
    navigator.clipboard.writeText(getProposalUrl(id))
    alert("リンクをコピーしました")
  }

  const handleCopyMessageAndLink = (
    clientName: string,
    ceoName: string | null,
    id: string
  ) => {
    const text = getMessageWithLink(clientName, ceoName, id)
    navigator.clipboard.writeText(text)
    alert("リンクと文面をコピーしました")
  }

  const handlePdfCopy = (id: string) => {
    navigator.clipboard.writeText(getProposalUrl(id))
    alert("PDFをコピーしました")
  }

  const filteredClients = searchQuery.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : clients

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              提案・ロードマップ履歴
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-13">
            顧問先へ提示した補助金提案書と、丸投げ用ロードマップの生成履歴・閲覧状況を管理します。
          </p>
        </div>

        {/* Top Action Bar */}
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="顧問先名・補助金名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 border-slate-200 focus-visible:ring-slate-400"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <Select defaultValue="all">
                  <SelectTrigger className="h-10 w-[200px] border-slate-200">
                    <Filter className="mr-2 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="ステータスで絞り込み" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="viewed">閲覧済み</SelectItem>
                    <SelectItem value="unviewed">未閲覧</SelectItem>
                    <SelectItem value="delegated">丸投げ済</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    総提案数
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {isLoading ? "—" : clients.length}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    閲覧済み
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    0
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Eye className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    丸投げ済
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    0
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Data Table or Empty State */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-slate-500">読み込み中...</p>
              </div>
            ) : error ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-slate-600">データの取得に失敗しました。</p>
                <p className="mt-1 text-xs text-slate-500">{error}</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  まだ提案履歴がありません。
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  AIスクリーニングで顧問先を登録すると、ここに履歴が表示されます。
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="h-12 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      顧問先名
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      提案内容
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      発行日
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      顧客の閲覧状況
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      アクション
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                        検索条件に一致する提案がありません。
                      </TableCell>
                    </TableRow>
                  ) : (
                  filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="group hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div>
                          <span className="font-medium text-slate-900">
                            {client.name}
                          </span>
                          {client.ceo_name?.trim() && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {client.ceo_name.trim()} 社長
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {PLACEHOLDER_PROPOSAL}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {formatDate(client.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge("unviewed", null, null)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => handleCopyLinkOnly(client.id)}
                          >
                            <Link2 className="mr-1.5 h-3.5 w-3.5" />
                            リンク
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() =>
                              handleCopyMessageAndLink(client.name, client.ceo_name ?? null, client.id)
                            }
                          >
                            <MessageSquareShare className="mr-1.5 h-3.5 w-3.5" />
                            リンクと文面
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => handlePdfCopy(client.id)}
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Footer Note */}
        {!isLoading && clients.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
            <p>
              提案書の閲覧状況はリアルタイムで更新されます。
            </p>
            <p>
              {filteredClients.length === clients.length
                ? `全 ${clients.length} 件を表示`
                : `全 ${clients.length} 件中 ${filteredClients.length} 件を表示`}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
