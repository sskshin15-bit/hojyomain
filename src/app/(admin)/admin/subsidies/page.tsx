"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { FileText, Save, Loader2, AlertCircle, FileSearch, Sparkles, CheckCircle, ExternalLink, RefreshCw, Link2, StopCircle, ArrowRight, Trash2, Plus, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubsidyStatusBadge } from "@/lib/subsidy-status"

function EditableListSection({
  title,
  titleClass,
  items,
  onChange,
  onAdd,
  hint,
}: {
  title: string
  titleClass: string
  items: string[]
  onChange: (arr: string[]) => void
  onAdd: () => void
  hint?: string
}) {
  return (
    <div>
      <h4 className={`mb-2 text-sm font-semibold ${titleClass}`}>{title}</h4>
      {hint && <p className="mb-2 text-xs text-blue-700">{hint}</p>}
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
              className="flex-1 border-slate-200 text-sm"
              placeholder="項目を入力"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={onAdd}
      >
        <Plus className="mr-1 h-3 w-3" />
        追加
      </Button>
    </div>
  )
}
import {
  getSubsidiesForAdmin,
  updateSubsidyAndConfirmFlags,
  approveAiProposalAndPublish,
  runPdfAnalysis,
  resetLinkAndStructuredData,
  updateStructuredSummary,
  markSourceExtract,
  updateFlagsReviewed,
  updateAdoptionRate,
  type SubsidyRow,
  type AdminSubsidiesFilters,
  type StructuredSummaryInput,
} from "./actions"
import { flagDegreeToBooleanForApprove } from "@/lib/subsidy-ai-parser"

export default function AdminSubsidiesPage() {
  const [list, setList] = useState<SubsidyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [flagsFilter, setFlagsFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "name_asc" | "name_desc">("created_desc")
  const [selected, setSelected] = useState<SubsidyRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editExclusive, setEditExclusive] = useState(false)
  const [editCertified, setEditCertified] = useState(false)
  const [editPostReport, setEditPostReport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [pdfAnalyzing, setPdfAnalyzing] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ message: string; count?: number; new_count?: number } | null>(null)
  const [fetchingLinks, setFetchingLinks] = useState(false)
  const [fetchLinksResult, setFetchLinksResult] = useState<{ message: string; processed?: number; success_count?: number; failed_count?: number } | null>(null)
  const [resettingLink, setResettingLink] = useState(false)
  const [runElapsed, setRunElapsed] = useState(0)
  const [runProgress, setRunProgress] = useState<{
    phase?: string
    message?: string
    processed?: number
    total?: number
    current?: number
    max?: number
  } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [activeDescTab, setActiveDescTab] = useState("structured")
  const [highlightCitation, setHighlightCitation] = useState<string | null>(null)
  const mergedContentRef = useRef<HTMLDivElement>(null)
  const [editStructuredSummary, setEditStructuredSummary] = useState<StructuredSummaryInput>({
    requirements: [],
    screening_criteria: [],
    exceptions: [],
    other: [],
    uncertain: [],
  })
  const [savingStructuredSummary, setSavingStructuredSummary] = useState(false)
  const [markingExtractIndex, setMarkingExtractIndex] = useState<number | null>(null)
  const [updatingFlagsReviewed, setUpdatingFlagsReviewed] = useState(false)
  const [editAdoptionRate, setEditAdoptionRate] = useState("")
  const [savingAdoptionRate, setSavingAdoptionRate] = useState(false)

  const consumeNdjsonStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onLine: (obj: Record<string, unknown>) => void
  ): Promise<Record<string, unknown> | null> => {
    const decoder = new TextDecoder()
    let buffer = ""
    let lastResult: Record<string, unknown> | null = null
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const obj = JSON.parse(trimmed) as Record<string, unknown>
          lastResult = obj
          onLine(obj)
        } catch {
          /* skip parse error */
        }
      }
    }
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer.trim()) as Record<string, unknown>
        lastResult = obj
        onLine(obj)
      } catch {
        /* skip */
      }
    }
    return lastResult
  }

  const filters: AdminSubsidiesFilters = {
    status: statusFilter === "all" ? undefined : statusFilter,
    flags_reviewed:
      flagsFilter === "reviewed" ? "reviewed" : flagsFilter === "unreviewed" ? "unreviewed" : undefined,
  }

  const filteredAndSortedList = useMemo(() => {
    let result = list
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((r) => (r.name ?? "").toLowerCase().includes(q))
    }
    result = [...result]
    if (sortBy === "name_asc") {
      result.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    } else if (sortBy === "name_desc") {
      result.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""))
    } else if (sortBy === "created_asc") {
      result.sort((a, b) => {
        const aAt = (a.created_at as string) ?? ""
        const bAt = (b.created_at as string) ?? ""
        return aAt.localeCompare(bAt)
      })
    } else {
      result.sort((a, b) => {
        const aAt = (a.created_at as string) ?? ""
        const bAt = (b.created_at as string) ?? ""
        return bAt.localeCompare(aAt)
      })
    }
    return result
  }, [list, searchQuery, sortBy])

  const load = async (refreshSelectedId?: string) => {
    setLoading(true)
    setListError(null)
    const { data, error } = await getSubsidiesForAdmin(filters)
    setList(data)
    setListError(error)
    setLoading(false)
    if (refreshSelectedId && data) {
      const updated = data.find((r) => r.id === refreshSelectedId)
      if (updated) setSelected(updated)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter, flagsFilter])

  useEffect(() => {
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [])

  useEffect(() => {
    setHighlightCitation(null)
  }, [selected?.id])

  useEffect(() => {
    if (highlightCitation && activeDescTab === "merged" && mergedContentRef.current) {
      const el = mergedContentRef.current.querySelector("#citation-target")
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightCitation, activeDescTab])

  useEffect(() => {
    if (selected) {
      setEditName(selected.name)
      setEditDescription(selected.description ?? "")
      setEditExclusive(selected.is_exclusive_to_scrivener ?? false)
      setEditCertified(selected.requires_certified_agency ?? false)
      setEditPostReport(selected.has_post_grant_reporting ?? false)
      setPdfUrl(selected.pdf_url ?? "")
      setPdfError(null)
      const ss = selected.structured_summary as StructuredSummaryInput | null | undefined
      setEditStructuredSummary({
        requirements: ss?.requirements ?? [],
        screening_criteria: ss?.screening_criteria ?? [],
        exceptions: ss?.exceptions ?? [],
        other: ss?.other ?? [],
        uncertain: ss?.uncertain ?? [],
      })
      setEditAdoptionRate(selected.adoption_rate ?? "")
    }
  }, [selected])

  const handleRunPdfAnalysis = async () => {
    if (!selected || !pdfUrl.trim()) return
    setPdfAnalyzing(true)
    setPdfError(null)
    const res = await runPdfAnalysis(selected.id, pdfUrl.trim())
    setPdfAnalyzing(false)
    if (res.ok) {
      load(selected.id)
    } else {
      setPdfError(res.error ?? "PDF解析に失敗しました")
    }
  }

  const handleApproveAiAndPublish = async () => {
    if (!selected?.ai_proposed_flags) return
    const f = selected.ai_proposed_flags as Record<string, unknown>
    const payload = {
      is_exclusive_to_scrivener: "is_exclusive_to_scrivener_degree" in f
        ? flagDegreeToBooleanForApprove(f.is_exclusive_to_scrivener_degree as "high" | "medium" | "none")
        : (f.is_exclusive_to_scrivener ?? false),
      requires_certified_agency: "requires_certified_agency_degree" in f
        ? flagDegreeToBooleanForApprove(f.requires_certified_agency_degree as "high" | "medium" | "none")
        : (f.requires_certified_agency ?? false),
      has_post_grant_reporting: "has_post_grant_reporting_degree" in f
        ? flagDegreeToBooleanForApprove(f.has_post_grant_reporting_degree as "high" | "medium" | "none")
        : (f.has_post_grant_reporting ?? false),
    }
    setApproving(true)
    setSaveError(null)
    const res = await approveAiProposalAndPublish(selected.id, payload)
    setApproving(false)
    if (res.ok) {
      load(selected.id)
    } else {
      setSaveError(res.error ?? "承認に失敗しました")
    }
  }

  const showAiProposal =
    selected?.status === "needs_review" &&
    (selected.ai_update_summary || selected.ai_proposed_flags)
  const canApproveAi = selected?.ai_proposed_flags != null

  const startElapsedTimer = () => {
    setRunElapsed(0)
    elapsedRef.current = setInterval(() => setRunElapsed((s) => s + 1), 1000)
  }

  const stopElapsedTimer = () => {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
  }

  const handleAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }

  const handleFetchLinkSources = async () => {
    setFetchingLinks(true)
    setFetchLinksResult(null)
    setListError(null)
    setRunProgress(null)
    startElapsedTimer()
    abortRef.current = new AbortController()
    const isBulk = !selected
    let totalProcessed = 0
    let totalSuccess = 0
    let totalFailed = 0
    const runOne = async (): Promise<{ processed: number; success_count: number; failed_count: number } | null> => {
      const res = await fetch("/api/admin/run-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "fetch-link-sources", subsidy_id: selected?.id ?? undefined }),
        signal: abortRef.current?.signal,
      })
      const contentType = res.headers.get("content-type") ?? ""
      if (contentType.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader()
        const last = await consumeNdjsonStream(reader, (obj) => {
          const phase = obj.phase as string | undefined
          setRunProgress({
            phase,
            message: obj.message as string | undefined,
            processed: totalProcessed + ((obj.processed as number) ?? 0),
            total: obj.total_subsidies as number | undefined,
            current: obj.subsidy_index as number | undefined,
            max: obj.urls_in_subsidy as number | undefined,
          })
        })
        if (last?.phase === "error") {
          setListError((last.error as string) ?? "リンク先取得に失敗しました")
          return null
        }
        if (res.status === 499) {
          setListError("中断されました")
          return null
        }
        if (last?.phase === "done" && res.ok) {
          return {
            processed: (last.processed as number) ?? 0,
            success_count: (last.success_count as number) ?? 0,
            failed_count: (last.failed_count as number) ?? 0,
          }
        }
        return null
      }
      const json = await res.json()
      if (res.status === 499 || json.aborted) {
        setListError("中断されました")
        return null
      }
      if (!res.ok) {
        setListError(json.error ?? json.detail ?? "リンク先取得に失敗しました")
        return null
      }
      return {
        processed: json.processed ?? 0,
        success_count: json.success_count ?? 0,
        failed_count: json.failed_count ?? 0,
      }
    }
    try {
      for (;;) {
        const result = await runOne()
        if (!result) break
        totalProcessed += result.processed
        totalSuccess += result.success_count
        totalFailed += result.failed_count
        if (isBulk && result.processed > 0) {
          load(selected?.id)
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        setFetchLinksResult({
          message: "リンク先取得完了",
          processed: totalProcessed,
          success_count: totalSuccess,
          failed_count: totalFailed,
        })
        load(selected?.id)
        break
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setListError(e instanceof Error ? e.message : "リンク先取得に失敗しました")
      } else {
        setListError("中断されました")
      }
    } finally {
      setFetchingLinks(false)
      setRunProgress(null)
      stopElapsedTimer()
      abortRef.current = null
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setListError(null)
    setRunProgress(null)
    startElapsedTimer()
    abortRef.current = new AbortController()
    try {
      const res = await fetch("/api/admin/run-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sync-subsidies" }),
        signal: abortRef.current.signal,
      })
      const contentType = res.headers.get("content-type") ?? ""
      if (contentType.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader()
        const last = await consumeNdjsonStream(reader, (obj) => {
          setRunProgress({
            phase: obj.phase as string | undefined,
            message: obj.message as string | undefined,
            processed: (obj.current ?? obj.total) as number | undefined,
            total: obj.total as number | undefined,
            current: obj.current as number | undefined,
            max: obj.max as number | undefined,
          })
        })
        if (last?.phase === "error") {
          setListError((last.error as string) ?? "同期に失敗しました")
        } else if (last?.phase === "done" && res.ok) {
          setSyncResult({
            message: (last.message as string) ?? "同期完了",
            count: last.count as number | undefined,
            new_count: last.new_count as number | undefined,
          })
          load()
        } else if (res.status === 499) {
          setListError("中断されました")
        }
      } else {
        const json = await res.json()
        if (res.ok) {
          setSyncResult({
            message: json.message ?? "同期完了",
            count: json.count,
            new_count: json.new_count,
          })
          load()
        } else if (res.status === 499 || json.aborted) {
          setListError("中断されました")
        } else {
          setListError(json.error ?? json.detail ?? "同期に失敗しました")
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setListError(e instanceof Error ? e.message : "同期に失敗しました")
      } else {
        setListError("中断されました")
      }
    } finally {
      setSyncing(false)
      setRunProgress(null)
      stopElapsedTimer()
      abortRef.current = null
    }
  }

  const handleSaveAdoptionRate = async () => {
    if (!selected) return
    setSavingAdoptionRate(true)
    setSaveError(null)
    const res = await updateAdoptionRate(selected.id, editAdoptionRate || null)
    setSavingAdoptionRate(false)
    if (res.ok) {
      setSelected({ ...selected, adoption_rate: editAdoptionRate || null })
      load(selected.id)
    } else {
      setSaveError(res.error ?? "採択率の保存に失敗しました")
    }
  }

  const handleToggleFlagsReviewed = async () => {
    if (!selected) return
    setUpdatingFlagsReviewed(true)
    setSaveError(null)
    const newValue = !(selected.flags_reviewed ?? false)
    const res = await updateFlagsReviewed(selected.id, newValue)
    setUpdatingFlagsReviewed(false)
    if (res.ok) {
      setSelected({ ...selected, flags_reviewed: newValue })
      load(selected.id)
    } else {
      setSaveError(res.error ?? "確認済みの更新に失敗しました")
    }
  }

  const handleMarkSourceExtract = async (index: number, mark: "dead" | "excluded") => {
    if (!selected) return
    setMarkingExtractIndex(index)
    setSaveError(null)
    const res = await markSourceExtract(selected.id, index, mark)
    setMarkingExtractIndex(null)
    if (res.ok) {
      load(selected.id)
    } else {
      setSaveError(res.error ?? "マークの保存に失敗しました")
    }
  }

  const handleSaveStructuredSummary = async () => {
    if (!selected) return
    setSavingStructuredSummary(true)
    setSaveError(null)
    const res = await updateStructuredSummary(selected.id, editStructuredSummary)
    setSavingStructuredSummary(false)
    if (res.ok) {
      load(selected.id)
    } else {
      setSaveError(res.error ?? "構造化データの保存に失敗しました")
    }
  }

  const updateStructuredSection = (
    key: keyof StructuredSummaryInput,
    updater: (arr: string[]) => string[]
  ) => {
    setEditStructuredSummary((s) => ({
      ...s,
      [key]: updater(s[key] ?? []),
    }))
  }

  const handleSaveAndConfirmFlags = async () => {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    const res = await updateSubsidyAndConfirmFlags(selected.id, {
      name: editName,
      description: editDescription || null,
      pdf_url: pdfUrl.trim() || null,
      is_exclusive_to_scrivener: editExclusive,
      requires_certified_agency: editCertified,
      has_post_grant_reporting: editPostReport,
      adoption_rate: editAdoptionRate || null,
      flags_reviewed: true,
    })
    setSaving(false)
    if (res.ok) {
      setSelected({ ...selected, name: editName, description: editDescription || null, pdf_url: pdfUrl.trim() || null, flags_reviewed: true, is_exclusive_to_scrivener: editExclusive, requires_certified_agency: editCertified, has_post_grant_reporting: editPostReport, adoption_rate: editAdoptionRate || null })
      load()
    } else {
      setSaveError(res.error ?? "保存に失敗しました")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="w-full py-6">
          <h1 className="text-2xl font-bold text-slate-900">補助金管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            ステータス・フラグ確認状況で絞り込み、編集してフラグを確定できます。
          </p>
        </div>
      </div>

      <div className="w-full py-6">
        {(syncing || fetchingLinks) && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">
                  {syncing ? "jGrants から補助金を同期しています…" : "概要のリンク先を取得しています…"}
                </p>
                <p className="text-sm text-amber-700">
                  {runProgress?.message ?? `経過 ${runElapsed} 秒`}
                  {runProgress?.processed != null && runProgress?.total != null && runProgress.total > 0 && (
                    <> ・ {runProgress.processed}/{runProgress.total} 件</>
                  )}
                  {!runProgress?.message && <>（完了まで最大5分かかることがあります）</>}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleAbort} className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100">
              <StopCircle className="mr-2 h-4 w-4" />
              中断
            </Button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600">ステータス</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">未確認</SelectItem>
                <SelectItem value="needs_review">要確認</SelectItem>
                <SelectItem value="published">公開中</SelectItem>
                <SelectItem value="archived">アーカイブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600">フラグ確認状況</Label>
            <Select value={flagsFilter} onValueChange={setFlagsFilter}>
              <SelectTrigger className="w-[180px] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="unreviewed">未確認</SelectItem>
                <SelectItem value="reviewed">確認済</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || fetchingLinks}
            className="shrink-0"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            jGrants API から補助金を同期
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetchLinkSources}
            disabled={syncing || fetchingLinks}
            className="shrink-0"
          >
            {fetchingLinks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            {selected ? "この補助金のリンク先を取得" : "概要のリンク先を取得（一括）"}
          </Button>
          {selected && (selected.source_extracts?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!selected) return
                setResettingLink(true)
                setListError(null)
                const res = await resetLinkAndStructuredData(selected.id)
                setResettingLink(false)
                if (res.ok) {
                  load(selected.id)
                } else {
                  setListError(res.error ?? "リセットに失敗しました")
                }
              }}
              disabled={syncing || fetchingLinks || resettingLink}
              className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              {resettingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              リンク先・AI構造化をリセット
            </Button>
          )}
          {fetchLinksResult && (
            <span className="text-sm text-blue-600">
              {fetchLinksResult.message}
              {fetchLinksResult.processed != null && `（${fetchLinksResult.processed}件処理、成功${fetchLinksResult.success_count ?? 0}、失敗${fetchLinksResult.failed_count ?? 0}）`}
            </span>
          )}
          {syncResult && (
            <span className="text-sm text-emerald-600">
              {syncResult.message}
              {syncResult.count != null && `（${syncResult.count}件`}
              {syncResult.new_count != null && syncResult.new_count > 0 && `、新規${syncResult.new_count}件`}
              {syncResult.count != null && `）`}
            </span>
          )}
        </div>

        <div className="grid h-[calc(100vh-14rem)] gap-6 lg:grid-cols-2">
          <Card className="flex min-h-0 flex-col border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-600" />
                一覧
              </CardTitle>
              <CardDescription className="text-slate-500">
                補助金を選択すると右で編集できます
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="補助金名で検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-slate-200"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[180px] border-slate-200">
                    <SelectValue placeholder="並び順" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_desc">作成日：新しい順</SelectItem>
                    <SelectItem value="created_asc">作成日：古い順</SelectItem>
                    <SelectItem value="name_asc">補助金名：あいうえお順</SelectItem>
                    <SelectItem value="name_desc">補助金名：逆順</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
                <Badge variant="secondary" className="text-xs">未確認</Badge>
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">確認済</Badge>
                <span className="text-slate-600">= 3フラグ（行政書士独占・認定支援機関・事後報告）の確認状況</span>
              </div>
              {listError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {listError}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredAndSortedList.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {list.length === 0 ? "該当する補助金がありません" : "検索条件に一致する補助金がありません"}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredAndSortedList.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                          selected?.id === row.id
                            ? "border-slate-400 bg-slate-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-slate-900">
                            {row.name || "(無題)"}
                          </span>
                          <div className="flex shrink-0 gap-1">
                            <SubsidyStatusBadge status={row.status} short showIcon={false} />
                            {row.flags_reviewed ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                確認済
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                未確認
                              </Badge>
                            )}
                          </div>
                        </div>
                        {row.ai_memo && (
                          <p className="mt-1 truncate text-xs text-amber-700">
                            {row.ai_memo}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900">
                編集パネル
              </CardTitle>
              <CardDescription className="text-slate-500">
                テキストと3つの警告フラグを編集し、「保存してフラグを確定する」で確定
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-auto">
              {!selected ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  左の一覧から補助金を選択してください
                </p>
              ) : (
                <div className="space-y-4">
                  {showAiProposal && (
                    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/90 p-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <Sparkles className="h-4 w-4" />
                        AI提案（点検用）
                      </p>
                      {selected.ai_update_summary && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-emerald-800">変更点の要約</p>
                          <p className="mt-1 text-sm text-emerald-900">
                            {selected.ai_update_summary}
                          </p>
                        </div>
                      )}
                      {selected.ai_proposed_flags && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-emerald-800">推奨フラグ（判定箇所付き）</p>
                          <ul className="mt-1 space-y-2 text-sm text-emerald-900">
                            <li>
                              <span className="font-medium">
                                行政書士独占: {selected.ai_proposed_flags.is_exclusive_to_scrivener ? "ON" : "OFF"}
                              </span>
                              {selected.ai_proposed_flags?.is_exclusive_to_scrivener_citation && (
                                  <p className="mt-0.5 rounded bg-emerald-100/80 px-2 py-1 text-xs text-emerald-800">
                                    「{selected.ai_proposed_flags.is_exclusive_to_scrivener_citation}」
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDescTab("merged")
                                        setHighlightCitation(selected.ai_proposed_flags!.is_exclusive_to_scrivener_citation ?? null)
                                      }}
                                      className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                                    >
                                      <ArrowRight className="h-3 w-3" />該当箇所へ
                                    </button>
                                  </p>
                                )}
                            </li>
                            <li>
                              <span className="font-medium">
                                認定支援機関必須: {selected.ai_proposed_flags.requires_certified_agency ? "ON" : "OFF"}
                              </span>
                              {selected.ai_proposed_flags?.requires_certified_agency_citation && (
                                  <p className="mt-0.5 rounded bg-emerald-100/80 px-2 py-1 text-xs text-emerald-800">
                                    「{selected.ai_proposed_flags.requires_certified_agency_citation}」
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDescTab("merged")
                                        setHighlightCitation(selected.ai_proposed_flags!.requires_certified_agency_citation ?? null)
                                      }}
                                      className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                                    >
                                      <ArrowRight className="h-3 w-3" />該当箇所へ
                                    </button>
                                  </p>
                                )}
                            </li>
                            <li>
                              <span className="font-medium">
                                事後報告義務: {selected.ai_proposed_flags.has_post_grant_reporting ? "ON" : "OFF"}
                              </span>
                              {selected.ai_proposed_flags?.has_post_grant_reporting_citation && (
                                  <p className="mt-0.5 rounded bg-emerald-100/80 px-2 py-1 text-xs text-emerald-800">
                                    「{selected.ai_proposed_flags.has_post_grant_reporting_citation}」
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDescTab("merged")
                                        setHighlightCitation(selected.ai_proposed_flags!.has_post_grant_reporting_citation ?? null)
                                      }}
                                      className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                                    >
                                      <ArrowRight className="h-3 w-3" />該当箇所へ
                                    </button>
                                  </p>
                                )}
                            </li>
                          </ul>
                        </div>
                      )}
                      {canApproveAi && (
                        <Button
                          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={handleApproveAiAndPublish}
                          disabled={approving}
                        >
                          {approving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          AIの提案を承認して公開（published）
                        </Button>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/admin/subsidies/${selected.id}`}
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Side-by-Side監査画面で開く
                  </Link>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">補助金名</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdf-url">公募要領PDFのURL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="pdf-url"
                        type="url"
                        placeholder="https://example.com/kobo-yoryo.pdf"
                        value={pdfUrl}
                        onChange={(e) => setPdfUrl(e.target.value)}
                        className="flex-1 border-slate-200"
                      />
                      <Button
                        variant="outline"
                        onClick={handleRunPdfAnalysis}
                        disabled={pdfAnalyzing || !pdfUrl.trim()}
                        className="shrink-0"
                      >
                        {pdfAnalyzing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileSearch className="mr-2 h-4 w-4" />
                        )}
                        解析を実行
                      </Button>
                    </div>
                    {pdfError && (
                      <p className="text-sm text-red-600">{pdfError}</p>
                    )}
                    {selected.pdf_raw_text && (
                      <p className="text-xs text-slate-500">
                        抽出済みテキスト: {selected.pdf_raw_text.length} 文字
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>要件・概要</Label>
                    <Tabs value={activeDescTab} onValueChange={setActiveDescTab} className="w-full">
                      <TabsList className="mb-3">
                        <TabsTrigger value="structured">AI構造化</TabsTrigger>
                        <TabsTrigger value="merged">統合概要</TabsTrigger>
                        <TabsTrigger value="sources">取得元別の詳細</TabsTrigger>
                        <TabsTrigger value="original">元の概要（編集）</TabsTrigger>
                      </TabsList>
                      <TabsContent value="structured" className="mt-0">
                        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50/50 p-4">
                          {selected ? (
                            <>
                              <EditableListSection
                                title="受給要件"
                                titleClass="text-emerald-800"
                                items={editStructuredSummary.requirements ?? []}
                                onChange={(arr) => updateStructuredSection("requirements", () => arr)}
                                onAdd={() =>
                                  updateStructuredSection("requirements", (a) => [...a, ""])
                                }
                              />
                              <EditableListSection
                                title="審査基準"
                                titleClass="text-violet-800"
                                items={editStructuredSummary.screening_criteria ?? []}
                                onChange={(arr) =>
                                  updateStructuredSection("screening_criteria", () => arr)
                                }
                                onAdd={() =>
                                  updateStructuredSection("screening_criteria", (a) => [
                                    ...a,
                                    "",
                                  ])
                                }
                              />
                              <EditableListSection
                                title="除外条件・例外"
                                titleClass="text-amber-800"
                                items={editStructuredSummary.exceptions ?? []}
                                onChange={(arr) => updateStructuredSection("exceptions", () => arr)}
                                onAdd={() =>
                                  updateStructuredSection("exceptions", (a) => [...a, ""])
                                }
                              />
                              <EditableListSection
                                title="その他重要情報"
                                titleClass="text-slate-800"
                                items={editStructuredSummary.other ?? []}
                                onChange={(arr) => updateStructuredSection("other", () => arr)}
                                onAdd={() => updateStructuredSection("other", (a) => [...a, ""])}
                              />
                              <div className="rounded border border-blue-200 bg-blue-50/80 p-3">
                                <EditableListSection
                                  title="要確認（AIが迷った項目）"
                                  titleClass="text-blue-800"
                                  items={editStructuredSummary.uncertain ?? []}
                                  onChange={(arr) =>
                                    updateStructuredSection("uncertain", () => arr)
                                  }
                                  onAdd={() =>
                                    updateStructuredSection("uncertain", (a) => [...a, ""])
                                  }
                                  hint="分類に迷った・解釈が分かれる可能性のある項目。不要なら削除、適切な分類へ移動してください。"
                                />
                              </div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={handleSaveStructuredSummary}
                                disabled={savingStructuredSummary}
                              >
                                {savingStructuredSummary ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="mr-2 h-4 w-4" />
                                )}
                                構造化データを保存（補助金判定に反映）
                              </Button>
                              <p className="text-center text-xs text-slate-400">
                                編集した内容は補助金判定システム（AI 5秒スクリーニング）に反映されます。各セクションは「追加」で項目を増やし、ゴミ箱で削除できます。
                              </p>
                              <Link
                                href={`/admin/subsidies/${selected.id}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                数値条件（資本金・従業員・除外業種）を詳細編集
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </>
                          ) : (
                            <p className="py-4 text-center text-sm text-slate-500">
                              補助金を選択すると編集できます。リンク先取得またはPDF解析を実行すると自動でAI構造化が抽出されます。
                            </p>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="merged" className="mt-0">
                        <div ref={mergedContentRef} className="min-h-[400px] max-h-[400px] overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 p-4">
                          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">
                            {(() => {
                              const src = selected.description_merged || selected.description || ""
                              const cite = highlightCitation ?? ""
                              const idx = cite && src ? src.indexOf(cite) : -1
                              if (idx >= 0 && cite) {
                                return (
                                  <>
                                    {src.slice(0, idx)}
                                    <mark id="citation-target" className="bg-amber-200">
                                      {cite}
                                    </mark>
                                    {src.slice(idx + cite.length)}
                                  </>
                                )
                              }
                              return src || "（統合データなし）"
                            })()}
                          </pre>
                          {(selected.source_extracts?.length ?? 0) > 0 && (
                            <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                              ※ 上の内容のうち「【リンク先・PDFから取得した情報】」は概要内のリンク先から取得しました
                            </p>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="sources" className="mt-0">
                        <div className="space-y-3">
                          {selected.source_extracts && selected.source_extracts.length > 0 ? (
                            <>
                              <p className="text-xs text-slate-500">
                                リンク切れ・参照不要とマークすると統合概要から除外され、次回以降このURLは取得しません。
                              </p>
                              {selected.source_extracts.map((e, i) => {
                                const marked = (e as { human_marked?: "dead" | "excluded" }).human_marked
                                return (
                                  <div
                                    key={i}
                                    className={`rounded-lg border p-4 ${
                                      marked
                                        ? "border-slate-200 bg-slate-50/50"
                                        : e.status === "success"
                                          ? "border-emerald-200 bg-emerald-50/50"
                                          : "border-red-200 bg-red-50/50"
                                    }`}
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                                      <a
                                        href={e.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="truncate text-sm font-medium text-blue-600 hover:underline"
                                      >
                                        {e.source_url}
                                      </a>
                                      <div className="flex shrink-0 flex-wrap gap-1">
                                        {marked ? (
                                          <Badge variant="secondary" className="text-xs">
                                            {marked === "dead" ? "リンク切れ" : "参照しない"}
                                          </Badge>
                                        ) : null}
                                        <Badge variant="outline" className="text-xs">
                                          {e.source_type === "pdf" ? "PDF" : "リンク"}
                                        </Badge>
                                        <Badge variant={e.status === "success" ? "default" : "destructive"} className="text-xs">
                                          {e.status === "success" ? "取得成功" : "失敗"}
                                        </Badge>
                                      </div>
                                    </div>
                                    {!marked && (
                                      <div className="mb-2 flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                          disabled={markingExtractIndex !== null}
                                          onClick={() => handleMarkSourceExtract(i, "dead")}
                                        >
                                          {markingExtractIndex === i ? (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          ) : null}
                                          リンク切れ（取得しない）
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                          disabled={markingExtractIndex !== null}
                                          onClick={() => handleMarkSourceExtract(i, "excluded")}
                                        >
                                          {markingExtractIndex === i ? (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          ) : null}
                                          参照不要（取得しない）
                                        </Button>
                                      </div>
                                    )}
                                    {e.status === "success" && e.extracted_text && (
                                      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                                        {e.extracted_text}
                                      </pre>
                                    )}
                                    {e.status === "failed" && e.error_message && (
                                      <p className="text-xs text-red-600">{e.error_message}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </>
                          ) : (
                            <p className="py-8 text-center text-sm text-slate-500">
                              リンク先から取得した情報はまだありません。「概要のリンク先を取得」ボタンを実行してください。
                            </p>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="original" className="mt-0">
                        <textarea
                          id="edit-desc"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={20}
                          className="min-h-[400px] w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-relaxed focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          jGrants から取得した元の概要。編集後は「保存してフラグを確定する」で保存してください。
                        </p>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <p className="mb-3 text-sm font-medium text-slate-800">採択率</p>
                    <p className="mb-2 text-xs text-slate-500">
                      AI判定のおすすめ表示で目立つように表示されます（例: 45%、約30%）
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={editAdoptionRate}
                        onChange={(e) => setEditAdoptionRate(e.target.value)}
                        placeholder="45% または 約30%"
                        className="max-w-[200px] border-slate-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={savingAdoptionRate}
                        onClick={handleSaveAdoptionRate}
                      >
                        {savingAdoptionRate ? <Loader2 className="h-4 w-4 animate-spin" /> : "反映"}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <p className="mb-3 flex items-center justify-between gap-2 text-sm font-medium text-slate-800">
                      <span>確認済み（3フラグ確認状況）</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={updatingFlagsReviewed}
                        onClick={handleToggleFlagsReviewed}
                      >
                        {updatingFlagsReviewed ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {selected.flags_reviewed ? "未確認に戻す" : "確認済みにする"}
                      </Button>
                    </p>
                    <p className="text-xs text-slate-500">
                      現在: {selected.flags_reviewed ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">確認済</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">未確認</Badge>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-900">
                      <AlertCircle className="h-4 w-4" />
                      警告フラグ（要領に基づきON/OFF）
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={editExclusive}
                          onCheckedChange={(c) => setEditExclusive(c === true)}
                        />
                        <span className="text-sm text-slate-700">
                          行政書士等の独占業務に該当する恐れ（is_exclusive_to_scrivener）
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={editCertified}
                          onCheckedChange={(c) => setEditCertified(c === true)}
                        />
                        <span className="text-sm text-slate-700">
                          認定支援機関必須（requires_certified_agency）
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={editPostReport}
                          onCheckedChange={(c) => setEditPostReport(c === true)}
                        />
                        <span className="text-sm text-slate-700">
                          事後報告義務あり（has_post_grant_reporting）
                        </span>
                      </label>
                    </div>
                  </div>
                  {saveError && (
                    <p className="text-sm text-red-600">{saveError}</p>
                  )}
                  <Button
                    className="w-full bg-slate-900 text-white hover:bg-slate-800"
                    onClick={handleSaveAndConfirmFlags}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    保存してフラグを確定する（flags_reviewed を true にする）
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
