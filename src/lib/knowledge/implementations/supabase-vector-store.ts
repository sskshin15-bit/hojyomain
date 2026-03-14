/**
 * Supabase pgvector による VectorStoreAdapter 実装
 * Contextual Retrieval / 冪等 Upsert / Safe Deprecation
 */

import { createClient } from "@supabase/supabase-js"
import type { KnowledgeChunkStatus } from "../schemas"
import type {
  VectorStoreAdapter,
  VectorChunkInput,
  RetrievedChunk,
} from "../adapters/vector-store"
import { EMBEDDING_MODEL } from "../embedding"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase env vars not configured")
  return createClient(url, key)
}

function rowToChunk(row: Record<string, unknown>, similarity?: number): RetrievedChunk {
  return {
    id: row.id as string,
    content: row.content as string,
    content_hash: row.content_hash as string,
    source: row.source as string,
    status: row.status as KnowledgeChunkStatus,
    summary: (row.summary as string) ?? null,
    keywords: (row.keywords as string[]) ?? null,
    similarity,
  }
}

export class SupabaseVectorStore implements VectorStoreAdapter {
  async upsertChunk(chunk: VectorChunkInput): Promise<{ id: string }> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("knowledge_chunks")
      .upsert(
        {
          content: chunk.content,
          content_hash: chunk.content_hash,
          embedding: chunk.embedding,
          embedding_model: EMBEDDING_MODEL,
          source: chunk.source,
          summary: chunk.summary ?? null,
          keywords: chunk.keywords ?? null,
          parent_id: chunk.parent_id ?? null,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "content_hash", ignoreDuplicates: false }
      )
      .select("id")
      .single()
    if (error) throw new Error(`Vector upsert failed: ${error.message}`)
    return { id: data.id }
  }

  async search(
    embedding: number[],
    options: { topK: number; similarityThreshold?: number }
  ): Promise<RetrievedChunk[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      match_count: options.topK,
      match_threshold: options.similarityThreshold ?? 0,
    })
    if (error) throw new Error(`Vector search failed: ${error.message}`)
    const rows = Array.isArray(data) ? data : []
    return rows.map((r: Record<string, unknown>) =>
      rowToChunk(r, r.similarity as number)
    )
  }

  async deprecateSimilar(
    embedding: number[],
    threshold: number,
    excludeContentHash?: string
  ): Promise<number> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc("deprecate_similar_chunks", {
      query_embedding: embedding,
      sim_threshold: threshold,
      exclude_hash: excludeContentHash ?? null,
    })
    if (error) throw new Error(`Deprecate similar failed: ${error.message}`)
    return Number(data ?? 0)
  }

  async getById(id: string): Promise<RetrievedChunk | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("knowledge_chunks")
      .select("id, content, content_hash, source, status, summary, keywords")
      .eq("id", id)
      .single()
    if (error || !data) return null
    return rowToChunk(data)
  }
}
