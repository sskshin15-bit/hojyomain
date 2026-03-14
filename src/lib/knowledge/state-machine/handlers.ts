/**
 * ステップハンドラ実装
 * parse_document: PDF解析 / create_chunks: Vector DB保存（Contextual Retrieval）
 */

import type { DocumentParserAdapter } from "../adapters/document-parser"
import type { VectorStoreAdapter } from "../adapters/vector-store"
import type { JobRecord } from "../adapters/job-repository"
import type { StepHandler } from "./executor"
import { createDocumentParser } from "../parsers"
import { SupabaseVectorStore } from "../implementations/supabase-vector-store"
import { embedTexts } from "../embedding"
import { createContextualChunk, summarizeDocument } from "../contextual-retrieval"
import { chunkText, hashContent } from "../chunk-utils"
import { runEnsemblePipeline } from "../ensemble-pipeline"

const DEFAULT_DEPRECATE_THRESHOLD = 0.92

export type HandlerDeps = {
  documentParser?: DocumentParserAdapter
  vectorStore?: VectorStoreAdapter
  deprecateSimilarityThreshold?: number
}

function getDefaultDeps(): HandlerDeps {
  return {
    documentParser: createDocumentParser(),
    vectorStore: new SupabaseVectorStore(),
    deprecateSimilarityThreshold: DEFAULT_DEPRECATE_THRESHOLD,
  }
}

export function createStepHandlers(deps: HandlerDeps = {}): Record<string, StepHandler> {
  const { documentParser, vectorStore, deprecateSimilarityThreshold } = {
    ...getDefaultDeps(),
    ...deps,
  }

  const initHandler: StepHandler = async () => ({})

  const parseDocumentHandler: StepHandler = async (job) => {
    const input = job.input_data as { pdf_url?: string }
    if (!input?.pdf_url) throw new Error("input_data.pdf_url is required")
    const parser = documentParser!
    const { fullText, elements } = await parser.parse(input.pdf_url, input.pdf_url)
    return {
      result_data: {
        parsed: true,
        full_text: fullText,
        elements_count: elements.length,
        source: input.pdf_url,
      },
    }
  }

  const createChunksHandler: StepHandler = async (job) => {
    const vs = vectorStore!
    const prev = (job.result_data ?? {}) as { full_text?: string; source?: string }
    const fullText = prev.full_text ?? ""
    const source = prev.source ?? "unknown"
    if (!fullText.trim()) throw new Error("No full_text from parse step")

    const parentSummary = summarizeDocument(fullText)
    const rawChunks = chunkText(fullText)
    if (rawChunks.length === 0) {
      return { result_data: { chunks_created: 0, source } }
    }

    const contextualChunks = rawChunks.map((c) => createContextualChunk(c, parentSummary))
    const embeddings = await embedTexts(contextualChunks)
    let created = 0

    for (let i = 0; i < contextualChunks.length; i++) {
      const content = contextualChunks[i]
      const contentHash = hashContent(content)
      const embedding = embeddings[i]
      const threshold = deprecateSimilarityThreshold ?? DEFAULT_DEPRECATE_THRESHOLD
      await vs.deprecateSimilar(embedding, threshold, contentHash)
      const { id } = await vs.upsertChunk({
        content,
        content_hash: contentHash,
        embedding,
        source,
        summary: parentSummary,
      })
      created++
    }

    return { result_data: { chunks_created: created, source } }
  }

  const runEnsembleHandler: StepHandler = async (job) => {
    const prev = (job.result_data ?? {}) as { source?: string }
    const input = job.input_data as { query?: string; pdf_url?: string }
    const query =
      input?.query?.trim() ||
      "この文書の主な要件・条件を抽出し、簡潔に要約してください。"
    const source = prev.source ?? input?.pdf_url
    const result = await runEnsemblePipeline(
      { query, sourceFilter: source },
      { vectorStore }
    )
    return {
      result_data: {
        answer: result.answer,
        verdict: result.verdict,
        critic_scores: result.critic_scores,
        sources_used: result.sources_used,
        critic_turns: result.critic_turns,
      },
    }
  }

  const runAggregatorHandler: StepHandler = async () => ({
    result_data: {},
  })

  const runCriticHandler: StepHandler = async () => ({
    result_data: {},
  })

  return {
    init: initHandler,
    parse_document: parseDocumentHandler,
    create_chunks: createChunksHandler,
    run_ensemble: runEnsembleHandler,
    run_aggregator: runAggregatorHandler,
    run_critic: runCriticHandler,
  }
}

export const stepHandlers = createStepHandlers()
