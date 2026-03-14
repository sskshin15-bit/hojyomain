import { PDFParse } from "pdf-parse"

/**
 * PDFのURLからテキストを抽出する
 * @param pdfUrl - 公募要領PDFのURL
 * @returns 抽出した生テキスト。失敗時はエラーを throw
 */
export async function extractTextFromPdfUrl(pdfUrl: string): Promise<string> {
  const url = pdfUrl.trim()
  if (!url) {
    throw new Error("PDFのURLを入力してください")
  }

  try {
    new URL(url)
  } catch {
    throw new Error("有効なURLを入力してください")
  }

  const parser = new PDFParse({ url })
  try {
    const result = await parser.getText()
    await parser.destroy()
    return result.text ?? ""
  } catch (err) {
    await parser.destroy().catch(() => {})
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`PDFのテキスト抽出に失敗しました: ${message}`)
  }
}
