import type {
  AnswerEntry,
  JudgmentDraft,
  SubsidyJudgmentData,
  JudgmentNode,
  QuestionNode,
  AlternativeNode,
  ResultNode,
} from "./types"
import { masterGlossary } from "./masterGlossary"

const DRAFT_KEY_PREFIX = "judgment_draft_"

/**
 * 回答履歴から nodeId -> 表示用文字列 のマップを生成
 */
export function answersToMap(answers: AnswerEntry[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of answers) {
    map[a.nodeId] = String(a.value)
  }
  return map
}

/**
 * 質問文・ヒント内の {{variableId}} を過去の回答で置換
 */
export function interpolateVariables(
  text: string,
  answersMap: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => answersMap[key] ?? `{{${key}}}`)
}

/** 途中保存を localStorage に書き込み（クライアント専用） */
export function saveDraftLocal(draft: JudgmentDraft): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DRAFT_KEY_PREFIX + draft.subsidy_id, JSON.stringify(draft))
  } catch {
    // ignore
  }
}

/** 途中保存を localStorage から読み込み */
export function loadDraftLocal(subsidyId: string): JudgmentDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY_PREFIX + subsidyId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as JudgmentDraft
    return parsed.subsidy_id && parsed.currentNodeId && Array.isArray(parsed.answers)
      ? parsed
      : null
  } catch {
    return null
  }
}

/** 途中保存を削除 */
export function clearDraftLocal(subsidyId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(DRAFT_KEY_PREFIX + subsidyId)
  } catch {
    // ignore
  }
}

/**
 * ノードから用語チェック用のテキストをすべて抽出
 */
function collectTextsFromNodes(nodes: SubsidyJudgmentData["nodes"]): string[] {
  const texts: string[] = []
  for (const node of Object.values(nodes)) {
    const n = node as JudgmentNode
    if (n.type === "question") {
      const q = n as QuestionNode
      texts.push(q.text, q.hint ?? "")
    } else if (n.type === "alternative") {
      const a = n as AlternativeNode
      texts.push(a.text, ...a.options.map((o) => o.label))
    } else if (n.type === "result") {
      const r = n as ResultNode
      texts.push(r.message)
    }
  }
  return texts
}

/**
 * 判定データの本文に登場するマスター用語を自動で含めた用語集を返す
 * data.glossary の定義は優先（上書き）される
 */
export function getEffectiveGlossary(data: SubsidyJudgmentData): Record<string, string> {
  const contentTexts = collectTextsFromNodes(data.nodes)
  const effective: Record<string, string> = {}
  const masterKeys = Object.keys(masterGlossary).filter(Boolean).sort((a, b) => b.length - a.length)
  for (const key of masterKeys) {
    const appears = contentTexts.some((t) => t.includes(key))
    if (appears) effective[key] = masterGlossary[key]
  }
  return { ...effective, ...data.glossary }
}
