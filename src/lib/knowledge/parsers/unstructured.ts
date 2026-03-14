/**
 * Unstructured API による DocumentParserAdapter 実装
 * 構造維持型PDF解析（表・段落レイアウトを保持）
 * 環境変数 UNSTRUCTURED_API_KEY が必要
 */

import type { DocumentParserAdapter, ParsedElement } from "../adapters/document-parser"

const UNSTRUCTURED_API_BASE = "https://api.unstructured.io/general/v0/general"

export class UnstructuredDocumentParser implements DocumentParserAdapter {
  private apiKey: string

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.UNSTRUCTURED_API_KEY
    if (!key?.trim()) {
      throw new Error("UNSTRUCTURED_API_KEY が未設定です")
    }
    this.apiKey = key
  }

  async parse(
    input: string | ArrayBuffer,
    source?: string
  ): Promise<{ elements: ParsedElement[]; fullText: string }> {
    const formData = new FormData()

    if (typeof input === "string") {
      const res = await fetch(input)
      if (!res.ok) throw new Error(`PDF取得失敗: ${res.status} ${res.statusText}`)
      const buffer = await res.arrayBuffer()
      formData.append("files", new Blob([buffer]), "document.pdf")
    } else {
      formData.append("files", new Blob([input]), "document.pdf")
    }

    const response = await fetch(UNSTRUCTURED_API_BASE, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(
        `Unstructured API エラー${source ? ` (${source})` : ""}: ${response.status} ${errText}`
      )
    }

    const data = (await response.json()) as Array<{ type?: string; text?: string }>
    const elements: ParsedElement[] = (data ?? []).map((el) => ({
      type: el.type ?? "paragraph",
      text: el.text ?? "",
      metadata: {},
    }))
    const fullText = elements.map((e) => e.text).filter(Boolean).join("\n\n")
    return { elements, fullText }
  }
}
