/**
 * ジョブ CRUD インターフェース
 * 排他制御・DLQ移送を抽象化
 */

import type { KnowledgeJobStatus } from "../schemas"

export type JobInput = {
  input_data: Record<string, unknown>
}

export type JobRecord = {
  job_id: string
  status: KnowledgeJobStatus
  current_step: string
  input_data: Record<string, unknown>
  result_data: Record<string, unknown> | null
  retry_count: number
  max_retries: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface JobRepositoryAdapter {
  /** ジョブ作成。status=pending, current_step=init で登録 */
  create(input: JobInput): Promise<{ job_id: string }>

  /** 排他取得（SELECT ... FOR UPDATE）。処理対象を1件取得 */
  claimNextPending(): Promise<JobRecord | null>

  /** ステップ更新（current_step, result_data, status） */
  updateStep(
    jobId: string,
    data: {
      current_step: string
      result_data?: Record<string, unknown>
      status?: KnowledgeJobStatus
      error_message?: string | null
    }
  ): Promise<void>

  /** リトライ回数をインクリメント */
  incrementRetry(jobId: string): Promise<void>

  /** job_id で取得 */
  getById(jobId: string): Promise<JobRecord | null>

  /** DLQへ移送（リトライ上限到達時） */
  moveToDlq(jobId: string, errorMessage: string): Promise<void>
}
