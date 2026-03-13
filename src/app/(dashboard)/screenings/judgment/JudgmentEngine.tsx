"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Lightbulb, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, ListTodo, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type {
  SubsidyJudgmentData,
  JudgmentNode,
  QuestionNode,
  AlternativeNode,
  ResultNode,
  AnswerEntry,
} from "./types"
import { evaluateCondition } from "./conditionEval"
import { saveJudgmentMock } from "./actions"
import { answersToMap, interpolateVariables, saveDraftLocal, loadDraftLocal, clearDraftLocal, getEffectiveGlossary } from "./utils"
import { GlossaryText } from "./GlossaryText"
import { SelectionSearch } from "./SelectionSearch"

const START_NODE_ID = "q1"

type Props = {
  data: SubsidyJudgmentData
  clientId?: string | null
  onComplete?: () => void
}

export function JudgmentEngine({ data, clientId = null, onComplete }: Props) {
  const [currentNodeId, setCurrentNodeId] = useState(START_NODE_ID)
  const [answers, setAnswers] = useState<AnswerEntry[]>([])
  const [nodeHistory, setNodeHistory] = useState<string[]>([START_NODE_ID])
  const [currentValue, setCurrentValue] = useState<string | number>("")
  const [saving, setSaving] = useState(false)
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  const nodes = data.nodes
  const node = nodes[currentNodeId] as JudgmentNode | undefined
  const effectiveGlossary = useMemo(() => getEffectiveGlossary(data), [data])

  useEffect(() => {
    const draft = loadDraftLocal(data.subsidy_id)
    if (draft && draft.answers.length > 0) {
      setShowResumePrompt(true)
    }
  }, [data.subsidy_id])

  const goTo = (nextId: string) => {
    setNodeHistory((prev) => [...prev, nextId])
    setCurrentNodeId(nextId)
    setCurrentValue("")
  }

  const recordAnswer = (nodeId: string, value: string | number) => {
    setAnswers((prev) => [...prev, { nodeId, value }])
  }

  const handleBack = () => {
    if (nodeHistory.length <= 1) return
    const newHistory = nodeHistory.slice(0, -1)
    const previousNodeId = newHistory[newHistory.length - 1]
    const lastAnswer = answers[answers.length - 1]
    setNodeHistory(newHistory)
    setCurrentNodeId(previousNodeId)
    setAnswers((prev) => prev.slice(0, -1))
    setCurrentValue(lastAnswer?.value ?? "")
  }

  const canGoBack = nodeHistory.length > 1 && (node?.type === "question" || node?.type === "alternative")

  const handleResume = () => {
    const draft = loadDraftLocal(data.subsidy_id)
    if (!draft) return
    let history = draft.nodeHistory
    if (!history || history.length === 0) {
      const path: string[] = [START_NODE_ID]
      for (const a of draft.answers) {
        if (path[path.length - 1] !== a.nodeId) path.push(a.nodeId)
      }
      if (path[path.length - 1] !== draft.currentNodeId) path.push(draft.currentNodeId)
      history = path
    }
    setCurrentNodeId(draft.currentNodeId)
    setAnswers(draft.answers)
    setNodeHistory(history)
    setCurrentValue("")
    setShowResumePrompt(false)
    clearDraftLocal(data.subsidy_id)
    toast({ title: "続きから再開しました", variant: "default" })
  }

  const handleStartOver = () => {
    clearDraftLocal(data.subsidy_id)
    setCurrentNodeId(START_NODE_ID)
    setAnswers([])
    setNodeHistory([START_NODE_ID])
    setCurrentValue("")
    setShowResumePrompt(false)
    toast({ title: "最初から始めます", variant: "default" })
  }

  const handleSaveDraft = () => {
    saveDraftLocal({
      subsidy_id: data.subsidy_id,
      currentNodeId,
      answers,
      nodeHistory,
      savedAt: Date.now(),
    })
    toast({ title: "保存しました。後で「続きから再開」できます。", variant: "default" })
  }

  const handleQuestionSubmit = () => {
    if (node?.type !== "question") return
    const q = node as QuestionNode
    const value =
      q.inputType === "number"
        ? Number(currentValue) || 0
        : q.inputType === "text"
          ? String(currentValue).trim()
          : String(currentValue)
    if (q.inputType === "yes_no" && value !== "yes" && value !== "no") return

    recordAnswer(currentNodeId, value)
    const next = q.next
    const ok = evaluateCondition(next.condition, value)
    goTo(ok ? next.trueNode : next.falseNode)
  }

  const handleAlternativeSelect = (nextNode: string) => {
    goTo(nextNode)
  }

  const handleResultSave = async () => {
    if (node?.type !== "result") return
    const result = node as ResultNode
    setSaving(true)
    await saveJudgmentMock({
      subsidy_id: data.subsidy_id,
      subsidy_name: data.subsidy_name,
      status: result.status,
      message: result.message,
      todo_list: result.todoList,
      answers,
      client_id: clientId ?? null,
    })
    setSaving(false)
    clearDraftLocal(data.subsidy_id)
    onComplete?.()
    toast({ title: "判定結果を保存しました", variant: "default" })
  }

  const answersMap = answersToMap(answers)
  const stepsCompleted = answers.length
  const isResultNode = node?.type === "result"
  const progressPercent = isResultNode
    ? 100
    : Math.min(95, stepsCompleted === 0 ? 0 : Math.round((stepsCompleted / (stepsCompleted + 2)) * 100))

  if (!node) {
    return (
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600">指定されたノードが見つかりませんでした。（{currentNodeId}）</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* プログレスバー ＋ 保存して後で再開 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-700 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isResultNode ? "完了" : `ステップ ${stepsCompleted + 1}（質問 ${stepsCompleted} 件回答済み）`}
            </p>
          </div>
          {!isResultNode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-slate-600"
              onClick={handleSaveDraft}
            >
              <Save className="mr-1.5 h-4 w-4" />
              保存して後で再開
            </Button>
          )}
        </div>
      </div>

      {/* 続きから再開しますか？ */}
      <Dialog open={showResumePrompt} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>続きから再開しますか？</DialogTitle>
            <DialogDescription>
              前回の回答が保存されています。続きから再開するか、最初からやり直すかを選んでください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleStartOver}>
              最初から始める
            </Button>
            <Button type="button" onClick={handleResume}>
              続きから再開する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* メインカード（選択範囲でウェブ検索可能） */}
      <SelectionSearch>
      {node.type === "question" && (() => {
        const q = node as QuestionNode
        const text = interpolateVariables(q.text, answersMap)
        const hint = interpolateVariables(q.hint ?? "", answersMap)
        const canSubmit =
          q.inputType === "number"
            ? currentValue !== "" && !Number.isNaN(Number(currentValue))
            : q.inputType === "text"
              ? String(currentValue).trim() !== ""
              : currentValue === "yes" || currentValue === "no"

        return (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">
                <GlossaryText text={text} glossary={effectiveGlossary} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {q.hint && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                    <GlossaryText text={hint} glossary={effectiveGlossary} variant="hint" />
                  </p>
                </div>
              )}
              {q.inputType === "number" && (
                <div className="space-y-2">
                  <Label htmlFor="judgment-value">回答</Label>
                  <Input
                    id="judgment-value"
                    type="number"
                    min={0}
                    value={currentValue === "" ? "" : currentValue}
                    onChange={(e) => setCurrentValue(e.target.value === "" ? "" : Number(e.target.value))}
                    className="max-w-[200px]"
                  />
                  <span className="text-sm text-slate-500">名</span>
                </div>
              )}
              {q.inputType === "text" && (
                <div className="space-y-2">
                  <Label htmlFor="judgment-value">回答</Label>
                  <Input
                    id="judgment-value"
                    type="text"
                    value={currentValue === "" ? "" : currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="max-w-[320px]"
                    placeholder="例：東京都、兵庫県"
                  />
                </div>
              )}
              {q.inputType === "yes_no" && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={currentValue === "yes" ? "default" : "outline"}
                    className={currentValue === "yes" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    onClick={() => setCurrentValue("yes")}
                  >
                    はい
                  </Button>
                  <Button
                    type="button"
                    variant={currentValue === "no" ? "default" : "outline"}
                    className={currentValue === "no" ? "bg-slate-700 hover:bg-slate-800" : ""}
                    onClick={() => setCurrentValue("no")}
                  >
                    いいえ
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex-1">
                  {canGoBack && (
                    <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={handleBack}>
                      <ChevronLeft className="mr-1.5 h-4 w-4" />
                      戻る
                    </Button>
                  )}
                </div>
                <Button type="button" onClick={handleQuestionSubmit} disabled={!canSubmit}>
                  次へ
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {node.type === "alternative" && (() => {
        const alt = node as AlternativeNode
        const text = interpolateVariables(alt.text, answersMap)
        return (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                代替ルート
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                <GlossaryText text={text} glossary={effectiveGlossary} />
              </p>
              <div className="space-y-2">
                {alt.options.map((opt, i) => (
                  <Button
                    key={i}
                    type="button"
                    variant="outline"
                    className="w-full justify-start border-slate-200 hover:bg-slate-50"
                    onClick={() => handleAlternativeSelect(opt.nextNode)}
                  >
                    <GlossaryText text={opt.label} glossary={effectiveGlossary} className="text-left" />
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                  </Button>
                ))}
              </div>
              <div className="pt-2">
                {canGoBack && (
                  <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={handleBack}>
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    戻る
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {node.type === "result" && (() => {
        const result = node as ResultNode
        const isSuccess = result.status === "success"
        const message = interpolateVariables(result.message, answersMap)
        return (
          <Card className={`shadow-sm ${isSuccess ? "border-emerald-200" : "border-amber-200"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                {isSuccess ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                判定結果
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className={`text-sm font-medium ${isSuccess ? "text-emerald-800" : "text-amber-800"}`}>
                <GlossaryText text={message} glossary={effectiveGlossary} />
              </p>
              {result.todoList.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <ListTodo className="h-4 w-4" />
                    次にやるべき To-Do
                  </p>
                  <ul className="space-y-2">
                    {result.todoList.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <Checkbox checked={false} disabled className="mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 pt-2">
                {canGoBack && (
                  <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={handleBack}>
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    戻る
                  </Button>
                )}
                <Button
                  type="button"
                  className={canGoBack ? "" : "w-full"}
                  onClick={handleResultSave}
                  disabled={saving}
                >
                  {saving ? "保存中..." : "判定結果を保存する"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })()}
      </SelectionSearch>
    </div>
  )
}
