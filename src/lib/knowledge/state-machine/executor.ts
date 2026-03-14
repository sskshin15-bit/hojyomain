/**
 * レジューム可能ステートマシン実行エンジン
 * 失敗時は Exponential Backoff を考慮して retry、上限で DLQ 移送
 */

import type { JobRepositoryAdapter, JobRecord } from "../adapters/job-repository"
import { getNextStep } from "./steps"

export type StepHandler = (
  job: JobRecord
) => Promise<{ result_data?: Record<string, unknown>; nextStep?: string }>

export type ExecutorDeps = {
  jobRepo: JobRepositoryAdapter
  stepHandlers: Record<string, StepHandler>
}

export async function runWorker(deps: ExecutorDeps): Promise<{ processed: number }> {
  const job = await deps.jobRepo.claimNextPending()
  if (!job) return { processed: 0 }

  const handler = deps.stepHandlers[job.current_step]
  if (!handler) {
    await deps.jobRepo.updateStep(job.job_id, {
      current_step: job.current_step,
      status: "failed",
      error_message: `Unknown step: ${job.current_step}`,
    })
    await deps.jobRepo.incrementRetry(job.job_id)
    const updated = await deps.jobRepo.getById(job.job_id)
    if (updated && updated.retry_count >= updated.max_retries) {
      await deps.jobRepo.moveToDlq(job.job_id, `Unknown step: ${job.current_step}`)
    } else {
      await deps.jobRepo.updateStep(job.job_id, { current_step: job.current_step, status: "pending" })
    }
    return { processed: 1 }
  }

  try {
    const outcome = await handler(job)
    const nextStep = outcome.nextStep ?? getNextStep(job.current_step)
    const resultData = outcome.result_data
      ? { ...(job.result_data ?? {}), ...outcome.result_data }
      : job.result_data

    if (nextStep === "complete" || !nextStep) {
      await deps.jobRepo.updateStep(job.job_id, {
        current_step: "complete",
        result_data: resultData ?? undefined,
        status: "completed",
        error_message: null,
      })
    } else {
      await deps.jobRepo.updateStep(job.job_id, {
        current_step: nextStep,
        result_data: resultData ?? undefined,
      })
    }
    return { processed: 1 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await deps.jobRepo.updateStep(job.job_id, {
      current_step: job.current_step,
      status: "failed",
      error_message: msg,
    })
    await deps.jobRepo.incrementRetry(job.job_id)

    const updated = await deps.jobRepo.getById(job.job_id)
    if (updated && updated.retry_count >= updated.max_retries) {
      await deps.jobRepo.moveToDlq(job.job_id, msg)
    } else {
      await deps.jobRepo.updateStep(job.job_id, {
        current_step: job.current_step,
        status: "pending",
      })
    }
    return { processed: 1 }
  }
}
