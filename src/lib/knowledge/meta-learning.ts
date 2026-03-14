/**
 * メタ学習（DSPy的アプローチ）
 * 人間の修正差分から Critic の弱点を推定し、プロンプトを動的改善
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { metaPromptImprovementSchema } from "./schemas/meta-learning"

/**
 * 人間の修正差分を解析し、Critic プロンプトを改善する
 * @param original - AIの元回答
 * @param corrected - 人間が修正した回答
 * @param currentPrompt - 現在のCriticシステムプロンプト
 */
export async function improveCriticPrompt(
  original: string,
  corrected: string,
  currentPrompt: string
): Promise<{ improvedPrompt: string; changesSummary: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
  const openai = createOpenAI({ apiKey })

  const diff = buildDiffDescription(original, corrected)

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: metaPromptImprovementSchema,
    prompt: `あなたはCritic評価AIのプロンプト改善者です。人間がAI回答を修正した差分を分析し、Criticが見逃した弱点（忠実性・関連性・論理性のいずれか）を特定してプロンプトを改善してください。

【人間の修正差分】
${diff}

【現在のCriticプロンプト】
${currentPrompt}

【出力ルール】
- improved_prompt: 上記プロンプトに、見逃しを防ぐための具体的な評価指示を追加・修正した全文
- changes_summary: 行った変更の要約（1〜2文、日本語）
- 追記は簡潔に。既存の3基準（忠実性・関連性・論理性）の定義を活かしつつ、今回の見逃しパターンに対するチェック項目を足す`,
  })

  return {
    improvedPrompt: object.improved_prompt,
    changesSummary: object.changes_summary,
  }
}

function buildDiffDescription(original: string, corrected: string): string {
  const o = original.trim()
  const c = corrected.trim()
  if (o === c) return "（差分なし）"
  return `【元のAI回答】
${o.slice(0, 2000)}${o.length > 2000 ? "\n..." : ""}

【人間による修正後】
${c.slice(0, 2000)}${c.length > 2000 ? "\n..." : ""}`
}
