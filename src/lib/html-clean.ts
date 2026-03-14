import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
})
turndownService.use(gfm)

/**
 * HTML を Markdown に変換する（表・リストの構造を維持）
 * jGrants の公募要領等で、AI が要件を正しく読めるようにする
 */
export function stripHtml(html: string): string {
  if (typeof html !== "string") return ""
  const trimmed = html.trim()
  if (!trimmed) return ""

  try {
    const markdown = turndownService.turndown(trimmed)
    return markdown
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  } catch {
    return trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  }
}
