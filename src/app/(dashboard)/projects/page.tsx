"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { FileText, ArrowRight, Loader2, ChevronRight, Briefcase } from "lucide-react"
import { getProjectsList, type ProjectListItem } from "./actions"

const STATUS_LABELS: Record<string, string> = {
  matching: "マッチング中",
  in_progress: "進行中",
  applying: "申請中",
  adopted: "採択",
  completed: "完了",
  canceled: "キャンセル",
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProjectsList().then((res) => {
      setProjects(res.data)
      setError(res.error)
      setLoading(false)
    })
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900">案件一覧</h1>
      <p className="mt-1 text-sm text-slate-500">
        専門家への丸投げマッチングと進行管理
      </p>

      {loading ? (
        <div className="mt-6 flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <Card className="mt-6 border-slate-200">
          <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="mt-6 border-slate-200">
          <CardContent className="py-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-600">まだ案件がありません</p>
            <p className="mt-1 text-sm text-slate-500">
              スクリーニング結果から補助金を選択し、チェックアウト画面で発注してください。
            </p>
            <Link
              href="/screenings"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <FileText className="h-4 w-4" />
              スクリーニング画面へ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">あなたの案件</CardTitle>
            <CardDescription>発注中・進行中の案件一覧（税理士・専門家・管理者）</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-200">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-slate-50 rounded-lg -mx-2 px-4 sm:mx-0 sm:px-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{p.subsidy_name}</p>
                      <p className="text-sm text-slate-500 truncate">{p.client_name} · {new Date(p.created_at).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          p.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "canceled"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/screenings"
              className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <FileText className="h-4 w-4" />
              新規発注（スクリーニングへ）
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
