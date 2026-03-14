/**
 * メタ学習（Criticプロンプト改善）構造化出力
 */

import { z } from "zod"

export const metaWeaknessAnalysisSchema = z.object({
  missed_criterion: z.enum(["fidelity", "relevance", "coherence"]),
  reason: z.string(),
  pattern: z.string(),
})

export const metaPromptImprovementSchema = z.object({
  improved_prompt: z.string(),
  changes_summary: z.string(),
})

export type MetaWeaknessAnalysis = z.infer<typeof metaWeaknessAnalysisSchema>
export type MetaPromptImprovement = z.infer<typeof metaPromptImprovementSchema>
