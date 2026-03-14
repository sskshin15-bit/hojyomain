/**
 * LLM呼び出し インターフェース（Prompt Caching対応）
 * 共通コンテキストのキャッシュでコスト最小化
 */

import type { z } from "zod"

export type PromptCacheConfig = {
  /** キャッシュ対象のシステムプロンプト or 共通コンテキスト */
  cacheableContent: string
  /** キャッシュ有効期間のヒント（秒）。未指定時はプロバイダー規定値 */
  ttlSeconds?: number
}

export interface StructuredLlmOptions<T extends z.ZodType> {
  /** システムプロンプト（キャッシュ推奨） */
  system?: string
  /** プロンプトキャッシュ設定。指定時は共通コンテキストをキャッシュ */
  promptCache?: PromptCacheConfig
  /** 出力Zodスキーマ（構造化出力強制） */
  schema: T
  /** 最大リトライ回数（Exponential Backoff） */
  maxRetries?: number
}

export interface LlmClientAdapter {
  /**
   * 構造化出力でLLMを呼び出す。Zodスキーマに従うJSONのみを返す
   */
  generateObject<T extends z.ZodType>(
    modelId: string,
    prompt: string,
    options: StructuredLlmOptions<T>
  ): Promise<z.infer<T>>

  /**
   * テキスト生成（要約等）。構造化不要な場合
   */
  generateText(
    modelId: string,
    prompt: string,
    options?: { system?: string; promptCache?: PromptCacheConfig; maxRetries?: number }
  ): Promise<string>
}
