/**
 * アンサンブル推論 構造化出力スキーマ
 */

import { z } from "zod"

export const ensembleOutputSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
})
export type EnsembleOutput = z.infer<typeof ensembleOutputSchema>
