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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Save, Loader2, AlertCircle } from "lucide-react"
import {
  getSubsidiesForAdmin,
  updateSubsidyAndConfirmFlags,
  type SubsidyRow,
  type AdminSubsidiesFilters,
} from "./actions"

export default function AdminSubsidiesPage() {
  const [list, setList] = useState<SubsidyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [flagsFilter, setFlagsFilter] = useState<string>("all")
  const [selected, setSelected] = useState<SubsidyRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editExclusive, setEditExclusive] = useState(false)
  const [editCertified, setEditCertified] = useState(false)
  const [editPostReport, setEditPostReport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const filters: AdminSubsidiesFilters = {
    status: statusFilter === "all" ? undefined : statusFilter,
    flags_reviewed:
      flagsFilter === "reviewed" ? "reviewed" : flagsFilter === "unreviewed" ? "unreviewed" : undefined,
  }

  const load = async () => {
    setLoading(true)
    setListError(null)
    const { data, error } = await getSubsidiesForAdmin(filters)
    setList(data)
    setListError(error)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [statusFilter, flagsFilter])

  useEffect(() => {
    if (selected) {
      setEditName(selected.name)
      setEditDescription(selected.description ?? "")
      setEditExclusive(selected.is_exclusive_to_scrivener ?? false)
      setEditCertified(selected.requires_certified_agency ?? false)
      setEditPostReport(selected.has_post_grant_reporting ?? false)
    }
  }, [selected])

  const handleSaveAndConfirmFlags = async () => {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    const res = await updateSubsidyAndConfirmFlags(selected.id, {
      name: editName,
      description: editDescription || null,
      is_exclusive_to_scrivener: editExclusive,
      requires_certified_agency: editCertified,
      has_post_grant_reporting: editPostReport,
      flags_reviewed: true,
    })
    setSaving(false)
    if (res.ok) {
      setSelected({ ...selected, name: editName, description: editDescription || null, flags_reviewed: true, is_exclusive_to_scrivener: editExclusive, requires_certified_agency: editCertified, has_post_grant_reporting: editPostReport })
      load()
    } else {
      setSaveError(res.error ?? "保存に失敗しました")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">補助金管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            ステータス・フラグ確認状況で絞り込み、編集してフラグを確定できます。
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600">ステータス</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">draft（未確認）</SelectItem>
                <SelectItem value="needs_review">needs_review（要確認）</SelectItem>
                <SelectItem value="published">published（公開中）</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-600" />
                一覧
              </CardTitle>
              <CardDescription className="text-slate-500">
                補助金を選択すると右で編集できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {listError}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : list.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  該当する補助金がありません
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.map((row) => (
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
                            <Badge variant="outline" className="text-xs">
                              {row.status ?? "—"}
                            </Badge>
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

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900">
                編集パネル
              </CardTitle>
              <CardDescription className="text-slate-500">
                テキストと3つの警告フラグを編集し、「保存してフラグを確定する」で確定
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  左の一覧から補助金を選択してください
                </p>
              ) : (
                <div className="space-y-4">
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
                    <Label htmlFor="edit-desc">要件・概要（クレンジング済み想定）</Label>
                    <textarea
                      id="edit-desc"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
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
