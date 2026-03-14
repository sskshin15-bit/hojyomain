/**
 * アンサンブル推論パイプライン
 * Retrieval → Ensemble（並列） → Aggregator → Critic（Max 2 turns）
 */

import type { VectorStoreAdapter } from "./adapters/vector-store"
import type { LlmClientAdapter } from "./adapters/llm-client"
import { embedText } from "./embedding"
import { SupabaseVectorStore } from "./implementations/supabase-vector-store"
import { OpenAILlmClient } from "./implementations/openai-llm-client"
import { getCriticPrompt } from "./implementations/supabase-system-prompts"
import { ensembleOutputSchema } from "./schemas/ensemble"
import {
  aggregatorOutputSchema,
  type AggregatorOutput,
} from "./schemas/aggregator"
import {
  criticOutputSchema,
  type CriticOutput,
} from "./schemas/critic"

const MODEL = "gpt-4o-mini"
const TOP_K = 8
const SIMILARITY_THRESHOLD = 0.7
const MAX_CRITIC_TURNS = 2

/** 複数エージェント用プロンプトバリエーション（並列で異なる視点） */
const ENSEMBLE_PROMPTS = [
  "知識に基づき簡潔に回答し、根拠を明示してください。",
  "要件・条件を網羅し、曖昧な点は「要確認」と付記してください。",
  "実務者向けに実用的な形でまとめてください。",
]

export type PipelineInput = {
  query: string
  sourceFilter?: string
}

export type PipelineResult = {
  answer: string
  verdict: "pass" | "revise" | "needs_review"
  critic_scores?: { fidelity: number; relevance: number; coherence: number }
  sources_used: string[]
  critic_turns: number
}

export type PipelineDeps = {
  vectorStore?: VectorStoreAdapter
  llmClient?: LlmClientAdapter
}

export async function runEnsemblePipeline(
  input: PipelineInput,
  deps: PipelineDeps = {}
): Promise<PipelineResult> {
  const vs = deps.vectorStore ?? new SupabaseVectorStore()
  const llm = deps.llmClient ?? new OpenAILlmClient()

  const queryEmbedding = await embedText(input.query)
  const chunks = await vs.search(queryEmbedding, {
    topK: TOP_K,
    similarityThreshold: SIMILARITY_THRESHOLD,
  })

  let filtered = chunks
  if (input.sourceFilter?.trim()) {
    filtered = chunks.filter((c) => c.source.includes(input.sourceFilter!))
  }
  const context = filtered.map((c) => c.content).join("\n\n---\n\n")
  const sourceIds = filtered.map((c) => c.source)

  if (!context.trim()) {
    return {
      answer: "関連する知識が見つかりませんでした。",
      verdict: "needs_review",
      sources_used: [],
      critic_turns: 0,
    }
  }

  const contextBlock = `【参照知識（status=active）】\n${context}`

  const ensembleOutputs = await Promise.all(
    ENSEMBLE_PROMPTS.map((variant) =>
      llm.generateObject<typeof ensembleOutputSchema>(MODEL, `${contextBlock}\n\n【質問】\n${input.query}\n\n【指示】\n${variant}\n\nJSON形式のみで回答してください。`, {
        schema: ensembleOutputSchema,
        system: "あなたは補助金・公募要件の専門家です。与えられた知識のみに基づき回答し、推測や捏造は避けてください。",
      })
    )
  )

  let aggregated: AggregatorOutput
  let criticResult: CriticOutput
  let criticTurn = 0
  let criticFeedback = ""

  const criticPromptRec = await getCriticPrompt()
  const criticSystem = criticPromptRec?.prompt_text ?? "厳密に評価してください。"

  while (true) {
    aggregated = await llm.generateObject<typeof aggregatorOutputSchema>(
      MODEL,
      criticTurn === 0
        ? `【アンサンブル回答】\n${ensembleOutputs.map((o, i) => `--- Agent ${i + 1} ---\n${o.answer}`).join("\n\n")}\n\n【参照知識】\n${context}\n\n【質問】\n${input.query}\n\n上記を比較・統合し、一つのベース回答を作成してください。`
        : `【前回のCritic指摘】\n${criticFeedback}\n\n【前回の統合回答】\n${aggregated!.answer}\n\n【参照知識】\n${context}\n\n上記を踏まえ、修正した統合回答を作成してください。`,
      {
        schema: aggregatorOutputSchema,
        system: "複数の回答を比較統合し、矛盾なく一つの回答にまとめてください。sources_usedには参照した知識の出典を列挙してください。",
      }
    )

    criticResult = await llm.generateObject<typeof criticOutputSchema>(
      MODEL,
      `【評価対象回答】\n${aggregated.answer}\n\n【参照知識】\n${context}\n\n【質問】\n${input.query}\n\n上記を忠実性・関連性・論理性で評価し、pass/revise/needs_reviewの判定をください。`,
      {
        schema: criticOutputSchema,
        system: criticSystem,
      }
    )

    criticTurn++

    if (criticResult.verdict === "pass") {
      return {
        answer: aggregated.answer,
        verdict: "pass",
        critic_scores: criticResult.scores,
        sources_used: aggregated.sources_used,
        critic_turns: criticTurn,
      }
    }

    if (criticResult.verdict === "needs_review" || criticTurn >= MAX_CRITIC_TURNS) {
      return {
        answer: aggregated.answer,
        verdict: criticTurn >= MAX_CRITIC_TURNS ? "needs_review" : criticResult.verdict,
        critic_scores: criticResult.scores,
        sources_used: aggregated.sources_used,
        critic_turns: criticTurn,
      }
    }

    criticFeedback = criticResult.issues.join(" ") + (criticResult.suggestion ?? "")
  }
}
