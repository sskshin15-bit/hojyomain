/**
 * 構造維持型PDFパーサー インターフェース
 * Unstructured API / LlamaParse / pdf-parse 等の実装を差し替え可能にする
 */

export type ParsedElement = {
  /** 要素種別（paragraph, table, list等） */
  type: string
  /** 抽出テキスト */
  text: string
  /** メタデータ（ページ番号等） */
  metadata?: Record<string, unknown>
}

export interface DocumentParserAdapter {
  /**
   * PDFのURLまたはバイナリから構造を維持してテキストを抽出する
   * @param input - PDFのURL、または ArrayBuffer（バイナリ）
   * @param source - 出典識別子（ログ用）
   */
  parse(
    input: string | ArrayBuffer,
    source?: string
  ): Promise<{ elements: ParsedElement[]; fullText: string }>
}
