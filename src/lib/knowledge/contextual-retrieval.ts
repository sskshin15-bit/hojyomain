/**
 * Contextual Retrieval: 親ドキュメント要約をチャンク先頭に付与
 * 検索時の文脈喪失を防ぐ
 */

export function createContextualChunk(
  chunkText: string,
  parentSummary: string
): string {
  if (!parentSummary.trim()) return chunkText
  return `[文脈] ${parentSummary.trim()}\n\n${chunkText}`
}

/** 親ドキュメントの簡易要約（先行実装。Step 5でLLM要約に置換可能） */
export function summarizeDocument(fullText: string, maxLen = 400): string {
  const t = fullText.trim()
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen) + "..."
}
