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
import { BookOpen, Loader2, Plus, Pencil, Trash2, Bot, User, FileText, ExternalLink } from "lucide-react"
import {
  getGlossaries,
  createGlossary,
  updateGlossary,
  deleteGlossary,
  type GlossaryRow,
} from "./actions"

export default function AdminGlossaryPage() {
  const [list, setList] = useState<GlossaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<GlossaryRow | null>(null)
  const [newTerm, setNewTerm] = useState("")
  const [newTooltip, setNewTooltip] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, err } = await getGlossaries()
    setList(data)
    setError(err)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!newTerm.trim()) return
    setSaving(true)
    setSaveError(null)
    const res = await createGlossary(newTerm.trim(), newTooltip.trim())
    setSaving(false)
    if (res.ok) {
      setNewTerm("")
      setNewTooltip("")
      load()
    } else {
      setSaveError(res.error ?? "登録に失敗しました")
    }
  }

  const handleUpdate = async (row: GlossaryRow, term: string, user_tooltip: string) => {
    setSaving(true)
    setSaveError(null)
    const res = await updateGlossary(row.id, term, user_tooltip)
    setSaving(false)
    if (res.ok) {
      setEditing(null)
      load()
    } else {
      setSaveError(res.error ?? "更新に失敗しました")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("削除してよろしいですか？")) return
    setSaving(true)
    setSaveError(null)
    const res = await deleteGlossary(id)
    setSaving(false)
    if (res.ok) {
      setEditing(null)
      load()
    } else {
      setSaveError(res.error ?? "削除に失敗しました")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-slate-600" />
            実務用語辞書（Glossary）
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            税理士向けのTooltipで表示する用語と解説を管理します。
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6">
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-base">新規登録</CardTitle>
            <CardDescription>罠となる用語と、税理士向けの実務上の注意点を入力</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-term">用語（term）</Label>
              <Input
                id="new-term"
                placeholder='例: ITツール, みなし大企業'
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tooltip">Tooltip（税理士向け解説）</Label>
              <textarea
                id="new-tooltip"
                placeholder="ホバー／タップ時に吹き出しで表示する内容"
                value={newTooltip}
                onChange={(e) => setNewTooltip(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <Button
              onClick={handleCreate}
              disabled={saving || !newTerm.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              登録
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">登録済み一覧</CardTitle>
            <CardDescription>用語をクリックして編集・削除</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : list.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">登録されている用語はありません</p>
            ) : (
              <ul className="space-y-3">
                {list.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    {editing?.id === row.id ? (
                      <GlossaryEditForm
                        row={row}
                        onSave={(term, tooltip) => handleUpdate(row, term, tooltip)}
                        onCancel={() => setEditing(null)}
                        saving={saving}
                        saveError={saveError}
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{row.term}</p>
                          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{row.user_tooltip}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                                row.source_type === "ai"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {row.source_type === "ai" ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              {row.source_type === "ai" ? "AI登録" : row.source_type === "manual" ? "手動登録" : "不明"}
                            </span>
                            {row.source_detail && (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <FileText className="h-3 w-3 shrink-0" />
                                {row.source_detail}
                              </span>
                            )}
                            {row.source_url && (
                              <a
                                href={row.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                情報源を開く
                              </a>
                            )}
                            {row.judgment_factor && (
                              <span className="text-amber-700">判断: {row.judgment_factor}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(row)}
                            disabled={saving}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(row.id)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GlossaryEditForm({
  row,
  onSave,
  onCancel,
  saving,
  saveError,
}: {
  row: GlossaryRow
  onSave: (term: string, user_tooltip: string) => void
  onCancel: () => void
  saving: boolean
  saveError: string | null
}) {
  const [term, setTerm] = useState(row.term)
  const [tooltip, setTooltip] = useState(row.user_tooltip)

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-600">用語</Label>
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="mt-1 border-slate-200"
        />
      </div>
      <div>
        <Label className="text-xs text-slate-600">Tooltip</Label>
        <textarea
          value={tooltip}
          onChange={(e) => setTooltip(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSave(term, tooltip)}
          disabled={saving || !term.trim()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          保存
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
