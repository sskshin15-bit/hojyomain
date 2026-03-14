/**
 * 知識管理システム モデル定義（Zod + 型）
 */

import { z } from "zod"

export const knowledgeChunkStatusSchema = z.enum(["active", "deprecated", "needs_review"])
export type KnowledgeChunkStatus = z.infer<typeof knowledgeChunkStatusSchema>

export const knowledgeJobStatusSchema = z.enum(["pending", "processing", "completed", "failed", "dlq"])
export type KnowledgeJobStatus = z.infer<typeof knowledgeJobStatusSchema>

export const knowledgeChunkSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  content_hash: z.string(),
  embedding: z.unknown().nullable(),
  embedding_model: z.string(),
  parent_id: z.string().uuid().nullable(),
  source: z.string(),
  status: knowledgeChunkStatusSchema,
  summary: z.string().nullable(),
  keywords: z.array(z.string()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>

export const knowledgeJobSchema = z.object({
  job_id: z.string().uuid(),
  status: knowledgeJobStatusSchema,
  current_step: z.string(),
  input_data: z.record(z.unknown()),
  result_data: z.record(z.unknown()).nullable(),
  retry_count: z.number().int().nonnegative(),
  max_retries: z.number().int().positive(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type KnowledgeJob = z.infer<typeof knowledgeJobSchema>

export const systemPromptSchema = z.object({
  id: z.string().uuid(),
  role: z.string(),
  prompt_text: z.string(),
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type SystemPrompt = z.infer<typeof systemPromptSchema>

export const dlqJobSchema = z.object({
  id: z.string().uuid(),
  original_job_id: z.string().uuid(),
  failed_at: z.string(),
  error_message: z.string().nullable(),
  input_data: z.record(z.unknown()).nullable(),
  created_at: z.string(),
})
export type DlqJob = z.infer<typeof dlqJobSchema>

export const knowledgeChunkArchiveSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  content_hash: z.string(),
  source: z.string(),
  status: z.string(),
  summary: z.string().nullable(),
  keywords: z.array(z.string()).nullable(),
  archived_at: z.string(),
})
export type KnowledgeChunkArchive = z.infer<typeof knowledgeChunkArchiveSchema>
