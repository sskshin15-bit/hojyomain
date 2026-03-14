/**
 * Critic 評価 構造化出力スキーマ（忠実性・関連性・論理性）
 */

import { z } from "zod"

export const criticScoreSchema = z.object({
  fidelity: z.number().min(0).max(10),
  relevance: z.number().min(0).max(10),
  coherence: z.number().min(0).max(10),
})
export type CriticScore = z.infer<typeof criticScoreSchema>

export const criticOutputSchema = z.object({
  scores: criticScoreSchema,
  verdict: z.enum(["pass", "revise", "needs_review"]),
  issues: z.array(z.string()),
  suggestion: z.string().optional(),
})
export type CriticOutput = z.infer<typeof criticOutputSchema>
