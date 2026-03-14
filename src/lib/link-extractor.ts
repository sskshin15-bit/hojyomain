/**
 * テキスト（Markdown含む）からURLを抽出する
 * - Markdown: [text](url)
 * - Raw: https://...
 */

const MARKDOWN_LINK = /\[([^\]]*)\]\((\s*https?:\/\/[^\s)]+)\s*\)/gi
const RAW_URL = /https?:\/\/[^\s)\]\"'<>]+/g

export function extractUrlsFromText(text: string | null | undefined): string[] {
  if (!text || typeof text !== "string") return []
  const seen = new Set<string>()
  const urls: string[] = []

  // Markdown links [text](url)
  let m: RegExpExecArray | null
  const re1 = new RegExp(MARKDOWN_LINK.source, "gi")
  while ((m = re1.exec(text)) !== null) {
    const u = m[2]?.trim()
    if (u && !seen.has(u)) {
      seen.add(u)
      urls.push(u)
    }
  }

  // Raw URLs
  const re2 = new RegExp(RAW_URL.source, "g")
  while ((m = re2.exec(text)) !== null) {
    const raw = m[0]
    // 末尾の閉じ括弧等を除去
    let u = raw.replace(/[)\]\}'">]+$/, "")
    if (u && !seen.has(u)) {
      seen.add(u)
      urls.push(u)
    }
  }

  return urls
}
