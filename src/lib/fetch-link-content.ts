/**
 * URLからコンテンツを取得し、PDFの場合はテキスト抽出、HTMLの場合はテキスト化
 * - ブラウザ風User-Agent・ヘッダでブロック回避
 * - リトライ・タイムアウト延長・プロキシ対応
 */

import { extractTextFromPdfUrl } from "@/lib/pdf-parser"
import { stripHtml } from "@/lib/html-clean"
import { fetch as undiciFetch, ProxyAgent } from "undici"

const FETCH_TIMEOUT_MS = 30000
const MAX_TEXT_LENGTH = 100000
const FETCH_RETRIES = 3
const RETRY_DELAY_MS = 2000

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ja,en;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
}

function getProxyDispatcher(): ProxyAgent | undefined {
  const proxy =
    process.env.FETCH_PROXY_URL?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim()
  if (!proxy) return undefined
  try {
    return new ProxyAgent(proxy)
  } catch {
    return undefined
  }
}

function getReferer(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}/`
  } catch {
    return ""
  }
}

async function fetchHtmlAsTextOnce(url: string): Promise<string> {
  const dispatcher = getProxyDispatcher()
  const headers: Record<string, string> = {
    ...BROWSER_HEADERS,
    Referer: getReferer(url),
  }
  const baseOptions: RequestInit = {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }
  const res = dispatcher
    ? await undiciFetch(url, { ...baseOptions, dispatcher })
    : await fetch(url, baseOptions)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const html = await res.text()
  return stripHtml(html).slice(0, MAX_TEXT_LENGTH)
}

async function fetchHtmlAsText(url: string): Promise<string> {
  return fetchWithRetry(() => fetchHtmlAsTextOnce(url))
}

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: Error | null = null
  for (let i = 0; i < FETCH_RETRIES; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      if (i < FETCH_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }
  throw lastErr ?? new Error("fetch failed")
}

export type SourceExtractItem = {
  source_type: "pdf" | "html"
  source_url: string
  fetched_at: string
  status: "success" | "failed"
  extracted_text: string | null
  content_preview: string | null
  error_message?: string
  /** 人間が「リンク切れ」または「参照不要」とマークした場合。参照・統合から除外し、次回取得もスキップ */
  human_marked?: "dead" | "excluded"
}

function shouldIncludeInMerge(e: SourceExtractItem): boolean {
  return e.human_marked !== "dead" && e.human_marked !== "excluded"
}

function isPdfUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const path = u.pathname.toLowerCase()
    return path.endsWith(".pdf") || path.includes(".pdf?")
  } catch {
    return false
  }
}

export async function fetchAndExtractFromUrl(
  url: string,
  fetchedAt: string
): Promise<SourceExtractItem> {
  const trimmed = url.trim()
  if (!trimmed) {
    return {
      source_type: "html",
      source_url: url,
      fetched_at: fetchedAt,
      status: "failed",
      extracted_text: null,
      content_preview: null,
      error_message: "URLが空です",
    }
  }

  try {
    new URL(trimmed)
  } catch {
    return {
      source_type: "html",
      source_url: trimmed,
      fetched_at: fetchedAt,
      status: "failed",
      extracted_text: null,
      content_preview: null,
      error_message: "無効なURLです",
    }
  }

  const likelyPdf = isPdfUrl(trimmed)

  if (likelyPdf) {
    try {
      const text = await fetchWithRetry(() => extractTextFromPdfUrl(trimmed))
      const t = text?.trim() ?? ""
      return {
        source_type: "pdf",
        source_url: trimmed,
        fetched_at: fetchedAt,
        status: "success",
        extracted_text: t || null,
        content_preview: t ? t.slice(0, 300) + (t.length > 300 ? "…" : "") : null,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        source_type: "pdf",
        source_url: trimmed,
        fetched_at: fetchedAt,
        status: "failed",
        extracted_text: null,
        content_preview: null,
        error_message: msg,
      }
    }
  }

  try {
    const text = await fetchHtmlAsText(trimmed)
    const t = text?.trim() ?? ""
    return {
      source_type: "html",
      source_url: trimmed,
      fetched_at: fetchedAt,
      status: "success",
      extracted_text: t || null,
      content_preview: t ? t.slice(0, 300) + (t.length > 300 ? "…" : "") : null,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      source_type: "html",
      source_url: trimmed,
      fetched_at: fetchedAt,
      status: "failed",
      extracted_text: null,
      content_preview: null,
      error_message: msg,
    }
  }
}

export function buildDescriptionFromSources(extracts: SourceExtractItem[]): string {
  const parts: string[] = []
  for (const e of extracts) {
    if (shouldIncludeInMerge(e) && e.status === "success" && e.extracted_text) {
      parts.push(`【${e.source_url} より】\n\n${e.extracted_text}`)
    }
  }
  return parts.join("\n\n---\n\n")
}

export function buildDescriptionMerged(
  originalDescription: string | null,
  extracts: SourceExtractItem[]
): string {
  const parts: string[] = []

  if (originalDescription?.trim()) {
    parts.push("【jGrants 概要（元）】\n\n" + originalDescription.trim())
  }

  const fromSources: string[] = []
  for (const e of extracts) {
    if (shouldIncludeInMerge(e) && e.status === "success" && e.extracted_text) {
      fromSources.push(`■ ${e.source_url}\n（このリンク先から取得）\n\n${e.extracted_text}`)
    }
  }
  if (fromSources.length > 0) {
    parts.push("【リンク先・PDFから取得した情報】\n\n" + fromSources.join("\n\n---\n\n"))
  }

  return parts.join("\n\n---\n\n")
}
