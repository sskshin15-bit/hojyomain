/**
 * パーサーファクトリ
 * UNSTRUCTURED_API_KEY があれば Unstructured、なければ pdf-parse を使用
 */

import type { DocumentParserAdapter } from "../adapters/document-parser"
import { PdfParseDocumentParser } from "./pdf-parse-adapter"
import { UnstructuredDocumentParser } from "./unstructured"

export { PdfParseDocumentParser } from "./pdf-parse-adapter"
export { UnstructuredDocumentParser } from "./unstructured"

export function createDocumentParser(): DocumentParserAdapter {
  if (process.env.UNSTRUCTURED_API_KEY?.trim()) {
    return new UnstructuredDocumentParser()
  }
  return new PdfParseDocumentParser()
}
