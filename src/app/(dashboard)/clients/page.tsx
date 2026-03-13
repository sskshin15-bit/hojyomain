"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  Filter,
  ListFilter,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  Sparkles,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/utils/supabase/client"

type ClientRow = {
  id: string
  name: string
  industry: string | null
  employees: number | null
  capital: string | null
  status: string
  created_at: string
}

function ScreeningBadge({ status }: { status: string }) {
  if (status === "AI診断完了") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium">
        <span className="mr-1.5">●</span>
        AI診断済
      </Badge>
    )
  }
  return (
    <Badge className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100 font-medium">
      <span className="mr-1.5">●</span>
      {status || "—"}
    </Badge>
  )
}

function ActionStatusBadge({ status }: { status: string }) {
  const label = status || "未対応"
  const isDone = label === "AI診断完了" || label === "対応完了"
  const isPending = label === "提案書作成待ち" || label === "要件確認中"
  if (isPending) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
      >
        {label}
      </Badge>
    )
  }
  if (isDone) {
    return (
      <Badge
        variant="outline"
        className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100"
      >
        {label}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100"
    >
      {label}
    </Badge>
  )
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

export default function CRMPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const client = createClient()
    async function fetchClients() {
      const { data, error: fetchError } = await client
        .from("clients")
        .select("id, name, industry, employees, capital, status, created_at")
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

  return (
    <main className="flex-1 bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            顧問先CRM
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            顧問先企業の管理と、各社の補助金マッチング状況・対応ステータスを一覧化します。
          </p>
        </div>
        <Button className="bg-slate-900 text-white hover:bg-slate-800 shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          新規顧問先を登録
        </Button>
      </div>

      {/* Action Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Global Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="企業名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-slate-200 bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-[160px] h-10 border-slate-200 bg-white">
              <Filter className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="業種で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="it">IT・通信</SelectItem>
              <SelectItem value="construction">建設業</SelectItem>
              <SelectItem value="design">デザイン</SelectItem>
              <SelectItem value="wholesale">卸売業</SelectItem>
              <SelectItem value="manufacturing">製造業</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[160px] h-10 border-slate-200 bg-white">
              <ListFilter className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="対応ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="proposal_pending">提案書作成待ち</SelectItem>
              <SelectItem value="confirming">要件確認中</SelectItem>
              <SelectItem value="completed">対応完了</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Data Table or Empty State */}
      <Card className="mt-6 border-slate-200 shadow-sm">
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
                まだ登録された顧問先がありません。
              </p>
              <p className="mt-1 text-sm text-slate-500">
                AIスクリーニング画面から最初のデータを登録してください。
              </p>
              <Button
                asChild
                className="mt-6 bg-slate-900 text-white hover:bg-slate-800"
              >
                <Link href="/screenings">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 5秒スクリーニングへ
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 pl-6">
                      企業名
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3">
                      業種/規模
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3">
                      最新のAIスクリーニング
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3">
                      対応ステータス
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3">
                      最終更新
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-3 pr-6 text-right">
                      アクション
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-slate-900 hover:text-slate-700 cursor-pointer">
                            {client.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{client.industry ?? "—"}</span>
                          <span className="text-slate-300">/</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            {client.employees != null ? `${client.employees}名` : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <ScreeningBadge status={client.status} />
                      </TableCell>
                      <TableCell className="py-4">
                        <ActionStatusBadge status={client.status} />
                      </TableCell>
                      <TableCell className="py-4 text-sm text-slate-500">
                        {formatDate(client.created_at)}
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-slate-600"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">メニューを開く</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>詳細を表示</DropdownMenuItem>
                            <DropdownMenuItem>スクリーニングを実行</DropdownMenuItem>
                            <DropdownMenuItem>提案書を作成</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <p className="text-sm text-slate-500">
                  全 <span className="font-medium text-slate-700">{clients.length}</span> 件を表示
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-slate-200"
                    disabled
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">前のページ</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-slate-200"
                    disabled
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">次のページ</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
