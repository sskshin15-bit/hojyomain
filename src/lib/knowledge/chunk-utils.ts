/**
 * チャンク分割・ハッシュ ユーティリティ
 */

import { createHash } from "crypto"

const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100

export function chunkText(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const chunks: string[] = []
  let start = 0
  while (start < trimmed.length) {
    let end = start + CHUNK_SIZE
    if (end < trimmed.length) {
      const lastSpace = trimmed.lastIndexOf(" ", end)
      if (lastSpace > start) end = lastSpace + 1
    }
    chunks.push(trimmed.slice(start, end).trim())
    start = end - CHUNK_OVERLAP
    if (start >= trimmed.length) break
  }
  return chunks.filter(Boolean)
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex")
}
