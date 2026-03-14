/**
 * Embedding 生成（OpenAI text-embedding-3-small）
 */

import OpenAI from "openai"

const MODEL = "text-embedding-3-small"
const DIM = 1536

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
  const openai = new OpenAI({ apiKey })
  const { data } = await openai.embeddings.create({
    model: MODEL,
    input: text.slice(0, 8191),
  })
  const vec = data[0]?.embedding
  if (!vec || vec.length !== DIM) throw new Error("Invalid embedding response")
  return vec
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
  const openai = new OpenAI({ apiKey })
  const res = await openai.embeddings.create({ model: MODEL, input: texts })
  const sorted = [...res.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  return sorted.map((d) => d.embedding)
}

export { DIM as EMBEDDING_DIM, MODEL as EMBEDDING_MODEL }
