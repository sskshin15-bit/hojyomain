"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Send, Crown, Paperclip, ExternalLink, CheckCircle } from "lucide-react"
import {
  getProjectWithContext,
  getExpertsForMatching,
  assignExpert,
  getProjectMessages,
  sendProjectMessage,
  getProjectFiles,
  uploadProjectFile,
  updateProjectStatus,
  updateProjectPaidStatus,
  type ProjectMessage,
  type ProjectFile,
  type ProjectDetail,
} from "./actions"

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Awaited<ReturnType<typeof getProjectWithContext>>["data"]>(null)
  const [experts, setExperts] = useState<Awaited<ReturnType<typeof getExpertsForMatching>>["data"]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  const load = async () => {
    const [projRes, expertsRes] = await Promise.all([
      getProjectWithContext(projectId),
      getExpertsForMatching(projectId),
    ])
    setProject(projRes.data)
    setError(projRes.error ?? expertsRes.error)
    setExperts(expertsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [projectId])

  const handleAssign = async (expertId: string) => {
    setAssigningId(expertId)
    setAssignError(null)
    const res = await assignExpert(projectId, expertId)
    setAssigningId(null)
    if (res.ok) {
      load()
    } else {
      setAssignError(res.error ?? "アサインに失敗しました")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }
  if (error || !project) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-red-600">{error ?? "案件が見つかりません"}</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> 案件一覧に戻る
        </Link>
      </div>
    )
  }

  const isMatching = project.status === "matching"

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> 案件一覧に戻る
      </Link>

      <Card className="mb-6 border-slate-200">
        <CardHeader>
          <CardTitle>{project.subsidy_name}</CardTitle>
          <CardDescription>
            顧問先: {project.client_name} / ステータス: {project.status}
          </CardDescription>
        </CardHeader>
      </Card>

      {isMatching && (
        <>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            専門家を選んで依頼する
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            上納金率が高い順に表示されています。上位の専門家がプラットフォームから優先的に案内されます。
          </p>

          {assignError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {assignError}
            </div>
          )}

          {experts.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center text-slate-500">
                登録されている専門家がいません。管理者に連絡してください。
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {experts.map((expert, idx) => (
                <Card
                  key={expert.id}
                  className={`border-slate-200 ${idx === 0 ? "border-2 border-amber-300 bg-amber-50/30" : ""}`}
                >
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4">
                      {idx === 0 && (
                        <Badge className="bg-amber-500 text-amber-950 border-amber-600 hover:bg-amber-500">
                          <Crown className="mr-1 h-3.5 w-3.5" />
                          認定プレミアムパートナー
                        </Badge>
                      )}
                      <div>
                        <p className="font-medium text-slate-900">
                          {expert.display_name ?? expert.id}
                        </p>
                        <p className="text-sm text-slate-500">
                          上納金率: {(expert.total_fee_rate * 100).toFixed(1)}%
                          （基本 {((expert.total_fee_rate - expert.bidding_fee_rate) * 100).toFixed(1)}% + 入札 {((expert.bidding_fee_rate) * 100).toFixed(1)}%）
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAssign(expert.id)}
                      disabled={!!assigningId}
                      className="shrink-0"
                    >
                      {assigningId === expert.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      この専門家に依頼
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!isMatching && (
        <>
          <ProjectStatusAndPayment project={project} projectId={projectId} onRefresh={load} />
          <ProjectWorkspace projectId={projectId} />
        </>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  matching: "マッチング中",
  in_progress: "進行中",
  applying: "申請中",
  adopted: "採択",
  completed: "完了",
  canceled: "キャンセル",
}

function ProjectStatusAndPayment({
  project,
  projectId,
  onRefresh,
}: {
  project: ProjectDetail
  projectId: string
  onRefresh: () => void
}) {
  const [updating, setUpdating] = useState(false)
  const [grantInput, setGrantInput] = useState("")
  const [statusError, setStatusError] = useState<string | null>(null)
  const [showAdoptForm, setShowAdoptForm] = useState(false)
  const [payUpdating, setPayUpdating] = useState(false)

  const nextActions: Record<string, { label: string; status: string; needsGrant?: boolean }[]> = {
    in_progress: [
      { label: "申請中にする", status: "applying" },
      { label: "キャンセル", status: "canceled" },
    ],
    applying: [
      { label: "採択にする", status: "adopted", needsGrant: true },
      { label: "キャンセル", status: "canceled" },
    ],
    adopted: [
      { label: "完了にする", status: "completed" },
      { label: "キャンセル", status: "canceled" },
    ],
  }
  const actions = nextActions[project.status] ?? []

  const handleStatusUpdate = async (newStatus: string, grantAmount?: number | null) => {
    setUpdating(true)
    setStatusError(null)
    const res = await updateProjectStatus(projectId, newStatus, grantAmount)
    setUpdating(false)
    if (res.ok) {
      setShowAdoptForm(false)
      setGrantInput("")
      onRefresh()
    } else {
      setStatusError(res.error ?? "更新に失敗しました")
    }
  }

  const handleTogglePaid = async () => {
    setPayUpdating(true)
    setStatusError(null)
    const res = await updateProjectPaidStatus(projectId, !project.is_paid)
    setPayUpdating(false)
    if (res.ok) onRefresh()
    else setStatusError(res.error ?? "更新に失敗しました")
  }

  const isAdmin = project.current_user_role === "admin"

  return (
    <div className="mb-6 space-y-4">
      <Card className="border-slate-200">
        <CardHeader className="py-3">
          <CardTitle className="text-base">ステータス</CardTitle>
          <CardDescription>現在: {STATUS_LABELS[project.status] ?? project.status}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{statusError}</div>
          )}
          {actions.length > 0 && !showAdoptForm && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) =>
                a.needsGrant ? (
                  <Button
                    key={a.status}
                    variant="outline"
                    size="sm"
                    disabled={updating}
                    onClick={() => setShowAdoptForm(true)}
                  >
                    採択にする（採択金額を入力）
                  </Button>
                ) : (
                  <Button
                    key={a.status}
                    variant={a.status === "canceled" ? "outline" : "default"}
                    size="sm"
                    disabled={updating}
                    onClick={() => handleStatusUpdate(a.status)}
                  >
                    {updating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    {a.label}
                  </Button>
                )
              )}
            </div>
          )}
          {showAdoptForm && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600">採択金額（円）</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="例: 500000"
                  value={grantInput}
                  onChange={(e) => setGrantInput(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                size="sm"
                disabled={updating || !/^\d+$/.test(grantInput) || Number(grantInput) < 1}
                onClick={() => handleStatusUpdate("adopted", Number(grantInput))}
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                採択を確定
              </Button>
              <Button variant="ghost" size="sm" disabled={updating} onClick={() => { setShowAdoptForm(false); setGrantInput("") }}>
                キャンセル
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(project.status === "adopted" || project.status === "completed") &&
        (project.grant_amount != null || project.success_fee_amount != null) && (
        <Card className="border-slate-200">
          <CardHeader className="py-3">
            <CardTitle className="text-base">決済サマリ</CardTitle>
            <CardDescription>採択に基づく成功報酬・プラットフォーム手数料</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {project.grant_amount != null && (
                <>
                  <dt className="text-slate-500">採択金額</dt>
                  <dd className="font-medium">{project.grant_amount.toLocaleString("ja-JP")} 円</dd>
                </>
              )}
              {project.success_fee_amount != null && (
                <>
                  <dt className="text-slate-500">成功報酬（税理士収入）</dt>
                  <dd className="font-medium">{project.success_fee_amount.toLocaleString("ja-JP")} 円</dd>
                </>
              )}
              {project.platform_fee_amount != null && (
                <>
                  <dt className="text-slate-500">プラットフォーム手数料（中抜き）</dt>
                  <dd className="font-medium">{project.platform_fee_amount.toLocaleString("ja-JP")} 円</dd>
                </>
              )}
              <dt className="text-slate-500">支払い状況</dt>
              <dd className="flex items-center gap-2">
                {project.is_paid ? "支払い済み" : "未払い"}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={payUpdating}
                    onClick={handleTogglePaid}
                    className="mt-1"
                  >
                    {payUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {project.is_paid ? "未払いに戻す" : "支払い済みにマーク"}
                  </Button>
                )}
              </dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [msgLoading, setMsgLoading] = useState(true)
  const [fileLoading, setFileLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState("chat")
  const [error, setError] = useState<string | null>(null)

  const loadMessages = useCallback(async () => {
    const res = await getProjectMessages(projectId)
    setMessages(res.data)
    setMsgLoading(false)
    if (res.error) setError(res.error)
  }, [projectId])

  const loadFiles = useCallback(async () => {
    const res = await getProjectFiles(projectId)
    setFiles(res.data)
    setFileLoading(false)
    if (res.error) setError(res.error)
  }, [projectId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleSendMessage = async () => {
    const text = newMessage.trim()
    if (!text || sending) return
    setSending(true)
    const res = await sendProjectMessage(projectId, text)
    setSending(false)
    if (res.ok) {
      setNewMessage("")
      loadMessages()
    } else {
      setError(res.error ?? "送信に失敗しました")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.set("file", file)
    const res = await uploadProjectFile(projectId, fd)
    setUploading(false)
    e.target.value = ""
    if (res.ok) {
      loadFiles()
    } else {
      setError(res.error ?? "アップロードに失敗しました")
    }
  }

  return (
    <Card className="border-slate-200 overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-base">プロジェクトワークスペース</CardTitle>
        <CardDescription>チャットとファイル共有（関係者のみアクセス可能）</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="border-b border-slate-200 px-4">
            <TabsList className="h-9 w-full justify-start">
              <TabsTrigger value="chat">チャット</TabsTrigger>
              <TabsTrigger value="files">ファイル</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" className="m-0 flex flex-col">
            <ScrollArea className="h-[280px] flex-1 px-4 py-3">
              {msgLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">まだメッセージがありません。</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <p className="text-xs text-slate-500">{m.sender_name} · {new Date(m.created_at).toLocaleString("ja-JP")}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex gap-2 border-t border-slate-200 p-4">
              <Textarea
                placeholder="メッセージを入力..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                className="min-h-[72px] resize-none"
                rows={2}
              />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} size="icon" className="shrink-0 h-9 w-9">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="files" className="m-0">
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">共有ファイル（最大10MB）</span>
                <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-slate-50 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  アップロード
                </label>
              </div>
              {fileLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : files.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">まだファイルがありません。</p>
              ) : (
                <ul className="space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span className="truncate text-sm">{f.file_name}</span>
                      {f.signed_url ? (
                        <a href={f.signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-500 hover:text-slate-700">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
