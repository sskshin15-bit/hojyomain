/**
 * pdf-parse による DocumentParserAdapter 実装
 * 既存の pdf-parse を利用。Unstructured API 未設定時のフォールバック
 */

import { PDFParse } from "pdf-parse"
import type { DocumentParserAdapter, ParsedElement } from "../adapters/document-parser"

export class PdfParseDocumentParser implements DocumentParserAdapter {
  async parse(
    input: string | ArrayBuffer,
    source?: string
  ): Promise<{ elements: ParsedElement[]; fullText: string }> {
    const url = typeof input === "string" ? input : undefined
    if (typeof input === "string" && !input.startsWith("http")) {
      throw new Error("URL 形式で指定してください（例: https://...）")
    }
    if (typeof input === "ArrayBuffer" && input.byteLength === 0) {
      throw new Error("空のPDFデータです")
    }

    const parser = new PDFParse(typeof input === "string" ? { url: input } : { data: input })
    try {
      const result = await parser.getText()
      await parser.destroy()
      const text = result.text ?? ""
      // 構造維持は限定的。段落単位で分割して elements を生成
      const elements = this.textToElements(text)
      return { elements, fullText: text }
    } catch (err) {
      await parser.destroy().catch(() => {})
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`PDF解析に失敗しました${source ? ` (${source})` : ""}: ${msg}`)
    }
  }

  private textToElements(text: string): ParsedElement[] {
    const trimmed = text.trim()
    if (!trimmed) return []
    const blocks = trimmed.split(/\n\n+/).filter((b) => b.trim().length > 0)
    return blocks.map((t) => ({ type: "paragraph", text: t.trim(), metadata: {} }))
  }
}
