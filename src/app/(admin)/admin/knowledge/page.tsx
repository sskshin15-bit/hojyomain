"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getKnowledgeDocuments,
  getKnowledgeChunks,
  getKnowledgeJobs,
  getDlqJobs,
  createKnowledgeJob,
  triggerKnowledgeWorker,
  runKnowledgeQuery,
  updateChunkStatus,
  type KnowledgeDocumentRow,
  type KnowledgeChunkRow,
  type KnowledgeJobRow,
  type DlqJobRow,
} from "./actions"
import {
  Loader2,
  FileText,
  Play,
  RefreshCw,
  Plus,
  Search,
  AlertTriangle,
} from "lucide-react"

const sourceDisplay = (s: string) => (s.length > 50 ? s.slice(0, 50) + "…" : s)

export default function AdminKnowledgePage() {
  const [list, setList] = useState<KnowledgeDocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selected, setSelected] = useState<KnowledgeDocumentRow | null>(null)
  const [chunks, setChunks] = useState<KnowledgeChunkRow[]>([])
  const [chunksLoading, setChunksLoading] = useState(false)
  const [chunkStatusFilter, setChunkStatusFilter] = useState("active")
  const [updatingChunk, setUpdatingChunk] = useState<string | null>(null)

  const [pdfUrl, setPdfUrl] = useState("")
  const [creating, setCreating] = useState(false)
  const [workerRunning, setWorkerRunning] = useState(false)
  const [createResult, setCreateResult] = useState<{ ok: boolean; jobId?: string; error?: string } | null>(null)
  const [workerResult, setWorkerResult] = useState<{ processed?: number } | null>(null)

  const [queryText, setQueryText] = useState("")
  const [queryRunning, setQueryRunning] = useState(false)
  const [queryResult, setQueryResult] = useState<{ answer?: string; verdict?: string; sources_used?: string[] } | null>(null)

  const [jobs, setJobs] = useState<KnowledgeJobRow[]>([])
  const [dlqJobs, setDlqJobs] = useState<DlqJobRow[]>([])

  const loadList = async () => {
    setLoading(true)
    setListError(null)
    const { data, error } = await getKnowledgeDocuments()
    setList(data)
    setListError(error)
    setLoading(false)
  }

  const loadChunks = async () => {
    if (!selected) return
    setChunksLoading(true)
    const { data } = await getKnowledgeChunks({
      status: chunkStatusFilter === "all" ? undefined : chunkStatusFilter,
      source: selected.source,
    })
    setChunks(data)
    setChunksLoading(false)
  }

  const loadJobsAndDlq = async () => {
    const [jobsRes, dlqRes] = await Promise.all([
      getKnowledgeJobs({ status: "all" }),
      getDlqJobs(),
    ])
    setJobs(jobsRes.data)
    setDlqJobs(dlqRes.data)
  }

  useEffect(() => {
    loadList()
    loadJobsAndDlq()
  }, [])

  useEffect(() => {
    if (selected) loadChunks()
  }, [selected?.source, chunkStatusFilter])

  const handleCreateJob = async () => {
    if (!pdfUrl.trim()) return
    setCreating(true)
    setCreateResult(null)
    const res = await createKnowledgeJob(pdfUrl.trim())
    setCreating(false)
    setCreateResult(res)
    if (res.ok) {
      setPdfUrl("")
      loadList()
      loadJobsAndDlq()
    }
  }

  const handleTriggerWorker = async () => {
    setWorkerRunning(true)
    setWorkerResult(null)
    const res = await triggerKnowledgeWorker()
    setWorkerRunning(false)
    setWorkerResult(res.ok ? { processed: res.processed } : null)
    if (res.ok) {
      loadList()
      loadJobsAndDlq()
      if (selected) loadChunks()
    }
  }

  const handleRunQuery = async () => {
    if (!queryText.trim()) return
    setQueryRunning(true)
    setQueryResult(null)
    const res = await runKnowledgeQuery(queryText.trim(), selected?.source)
    setQueryRunning(false)
    if (res.ok && res.data) {
      setQueryResult(res.data as { answer: string; verdict: string; sources_used: string[] })
    }
  }

  const handleUpdateChunkStatus = async (id: string, status: "active" | "deprecated" | "needs_review") => {
    setUpdatingChunk(id)
    const res = await updateChunkStatus(id, status)
    setUpdatingChunk(null)
    if (res.ok) loadChunks()
  }

  const pendingCount = jobs.filter((j) => j.status === "pending").length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">知識管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            左の一覧からドキュメントを選択すると右で内容を確認・質問できます
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerWorker}
            disabled={workerRunning}
            className="shrink-0"
          >
            {workerRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            ワーカー実行
          </Button>
          {workerResult?.processed != null && workerResult.processed > 0 && (
            <span className="text-sm text-emerald-600">✓ {workerResult.processed}件 処理しました</span>
          )}
          {pendingCount > 0 && (
            <span className="text-sm text-amber-600">{pendingCount}件 待機中</span>
          )}
          {dlqJobs.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              DLQ {dlqJobs.length}件
            </span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左: 一覧 */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-600" />
                一覧
              </CardTitle>
              <CardDescription className="text-slate-500">
                ドキュメントを選択すると右で内容を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 新規登録フォーム */}
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <Label className="text-xs text-slate-600">新規登録（PDF URL）</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-sm"
                  />
                  <Button size="sm" onClick={handleCreateJob} disabled={creating || !pdfUrl.trim()}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
                {createResult && (
                  <p className={`mt-2 text-xs ${createResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                    {createResult.ok ? "登録しました。ワーカー実行で解析を開始" : createResult.error}
                  </p>
                )}
              </div>

              {listError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {listError}
                </div>
              )}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : list.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  ドキュメントがありません。上のフォームからPDFを登録してください
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((row) => (
                    <li key={row.source}>
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                          selected?.source === row.source
                            ? "border-slate-400 bg-slate-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-slate-900">
                            {sourceDisplay(row.source)}
                          </span>
                          <div className="flex shrink-0 gap-1">
                            <Badge variant="outline" className="text-xs">
                              {row.totalChunks}件
                            </Badge>
                            {row.activeChunks < row.totalChunks && (
                              <Badge variant="secondary" className="text-xs">
                                active {row.activeChunks}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 右: 詳細パネル */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900">
                詳細パネル
              </CardTitle>
              <CardDescription className="text-slate-500">
                {selected ? "チャンクの確認・質問・整理" : "左の一覧からドキュメントを選択してください"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  左の一覧からドキュメントを選択してください
                </p>
              ) : (
                <div className="space-y-6">
                  {/* 質問 */}
                  <div>
                    <Label className="text-sm font-medium">このドキュメントに質問</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="例: 主な要件・対象条件は？"
                        className="flex-1"
                      />
                      <Button onClick={handleRunQuery} disabled={queryRunning || !queryText.trim()}>
                        {queryRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {queryResult && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                        <Badge variant={queryResult.verdict === "pass" ? "default" : "secondary"} className="mb-2">
                          {queryResult.verdict}
                        </Badge>
                        <p className="text-slate-800 whitespace-pre-wrap">{queryResult.answer}</p>
                      </div>
                    )}
                  </div>

                  {/* チャンク一覧 */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <Label className="text-sm font-medium">チャンク一覧</Label>
                      <Select value={chunkStatusFilter} onValueChange={setChunkStatusFilter}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="deprecated">deprecated</SelectItem>
                          <SelectItem value="needs_review">要確認</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {chunksLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : chunks.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">チャンクがありません</p>
                    ) : (
                      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                        {chunks.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs mb-1">
                                  {c.status}
                                </Badge>
                                <p className="text-slate-700 line-clamp-2 text-xs">
                                  {c.content.replace(/^\[文脈\].*?\n\n/s, "").slice(0, 120)}…
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {c.status !== "active" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleUpdateChunkStatus(c.id, "active")}
                                    disabled={updatingChunk === c.id}
                                  >
                                    {updatingChunk === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "有効"}
                                  </Button>
                                )}
                                {c.status !== "deprecated" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleUpdateChunkStatus(c.id, "deprecated")}
                                    disabled={updatingChunk === c.id}
                                  >
                                    非推奨
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
