/**
 * ステートマシン ステップ定義
 * 各ステップは冪等に設計し、current_step からレジューム可能
 */

export const STEPS = [
  "init",
  "parse_document",
  "create_chunks",
  "run_ensemble",
  "run_aggregator",
  "run_critic",
  "complete",
] as const

export type StepId = (typeof STEPS)[number]

export const STEP_ORDER: StepId[] = [
  "init",
  "parse_document",
  "create_chunks",
  "run_ensemble",
  "run_aggregator",
  "run_critic",
  "complete",
]

export function getNextStep(current: string): StepId | null {
  const idx = STEP_ORDER.indexOf(current as StepId)
  if (idx < 0 || idx >= STEP_ORDER.length - 1) return null
  return STEP_ORDER[idx + 1]
}
