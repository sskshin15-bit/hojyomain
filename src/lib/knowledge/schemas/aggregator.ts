/**
 * Aggregator 統合AI 構造化出力スキーマ
 */

import { z } from "zod"

export const aggregatorOutputSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  sources_used: z.array(z.string()),
  reasoning: z.string().optional(),
})
export type AggregatorOutput = z.infer<typeof aggregatorOutputSchema>
