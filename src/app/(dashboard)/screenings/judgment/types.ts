/**
 * 補助金判定エンジン用型定義
 * mockSubsidyData.json の構造に合わせた汎用型
 */

export type InputType = "number" | "yes_no" | "text"

export type QuestionNext = {
  condition: string
  trueNode: string
  falseNode: string
}

export type QuestionNode = {
  type: "question"
  text: string
  inputType: InputType
  hint: string
  next: QuestionNext
}

export type AlternativeOption = {
  label: string
  nextNode: string
}

export type AlternativeNode = {
  type: "alternative"
  text: string
  options: AlternativeOption[]
}

export type ResultNode = {
  type: "result"
  status: "success" | "failure"
  message: string
  todoList: string[]
}

export type JudgmentNode = QuestionNode | AlternativeNode | ResultNode

export type NodesMap = Record<string, JudgmentNode>

/** 専門用語の定義（用語解説・ツールチップ用） */
export type Glossary = Record<string, string>

export type SubsidyJudgmentData = {
  subsidy_id: string
  subsidy_name: string
  nodes: NodesMap
  /** 専門用語とその定義。テキスト内のキーがハイライトされ、ホバー/タップで解説を表示 */
  glossary?: Glossary
}

/** ユーザーの回答1件 */
export type AnswerEntry = {
  nodeId: string
  value: string | number
}

/** 判定結果＋回答履歴（Supabase保存用） */
export type JudgmentRecord = {
  subsidy_id: string
  subsidy_name: string
  status: "success" | "failure"
  message: string
  todo_list: string[]
  answers: AnswerEntry[]
  client_id?: string | null
}

/** 途中保存用（Save & Resume） */
export type JudgmentDraft = {
  subsidy_id: string
  currentNodeId: string
  answers: AnswerEntry[]
  /** 遷移履歴（戻る用）。先頭が最初のノード、末尾が現在のノード。旧保存データには無い場合あり */
  nodeHistory?: string[]
  savedAt: number
}
