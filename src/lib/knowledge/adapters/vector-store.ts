/**
 * Vector DB（pgvector）操作 インターフェース
 * Contextual Retrieval / 冪等Upsert / Safe Deprecation を抽象化
 */

import type { KnowledgeChunkStatus } from "../schemas"

export type VectorChunkInput = {
  content: string
  content_hash: string
  embedding: number[]
  source: string
  summary?: string | null
  keywords?: string[] | null
  parent_id?: string | null
}

export type RetrievedChunk = {
  id: string
  content: string
  content_hash: string
  source: string
  status: KnowledgeChunkStatus
  summary: string | null
  keywords: string[] | null
  similarity?: number
}

export interface VectorStoreAdapter {
  /**
   * チャンクをUpsert（content_hashで冪等、重複排除）
   * 親ドキュメント要約は content 先頭に付与済みであること（Contextual Retrieval）
   */
  upsertChunk(chunk: VectorChunkInput): Promise<{ id: string }>

  /**
   * ベクトル検索。status=active のチャンクのみ対象
   */
  search(
    embedding: number[],
    options: { topK: number; similarityThreshold?: number }
  ): Promise<RetrievedChunk[]>

  /**
   * 類似度閾値を超えた既存チャンクを論理削除（status=deprecated）
   * 物理削除は行わない（Safe Deprecation）
   */
  deprecateSimilar(
    embedding: number[],
    threshold: number,
    excludeContentHash?: string
  ): Promise<number>

  /**
   * 指定IDのチャンクを取得
   */
  getById(id: string): Promise<RetrievedChunk | null>
}
