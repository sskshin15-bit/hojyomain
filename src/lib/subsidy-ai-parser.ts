import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

export const structuredRequirementsSchema = z.object({
  max_employees: z.number().nullable(),
  min_employees: z.number().nullable(),
  max_capital: z.number().nullable(),
  min_capital: z.number().nullable(),
  excluded_industries: z.array(z.string()),
  included_industries: z.array(z.string()),
  requires_black_ink: z.boolean().nullable(),
})

const flagDegreeSchema = z.enum(["high", "medium", "none"])
export const aiProposedFlagsSchema = z.object({
  is_exclusive_to_scrivener_degree: flagDegreeSchema,
  is_exclusive_to_scrivener_citation: z.string().nullable(),
  requires_certified_agency_degree: flagDegreeSchema,
  requires_certified_agency_citation: z.string().nullable(),
  has_post_grant_reporting_degree: flagDegreeSchema,
  has_post_grant_reporting_citation: z.string().nullable(),
})

export type StructuredRequirements = z.infer<typeof structuredRequirementsSchema>
export type AiProposedFlags = z.infer<typeof aiProposedFlagsSchema>
export type FlagDegree = "high" | "medium" | "none"

/** 3段階の程度を boolean に変換（high のみ ON、自動DB反映用） */
export function flagDegreeToBoolean(degree: FlagDegree | undefined): boolean {
  return degree === "high"
}

/** AI提案を反映時に使用（high および medium=要確認 を ON） */
export function flagDegreeToBooleanForApprove(degree: FlagDegree | undefined): boolean {
  return degree === "high" || degree === "medium"
}

const extractionOutputSchema = z.object({
  structured_requirements: structuredRequirementsSchema,
  ai_proposed_flags: aiProposedFlagsSchema,
})

export async function analyzeSubsidyText(text: string): Promise<{
  structured_requirements: StructuredRequirements
  ai_proposed_flags: AiProposedFlags
}> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured.")
  }
  const openai = createOpenAI({ apiKey: openaiKey })

  const truncated = text.slice(0, 12000)

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: extractionOutputSchema,
    prompt: `公募要領のテキストから以下を抽出してください。

【テキスト】
${truncated}

【出力ルール】
- structured_requirements: 数値条件（従業員数・資本金の上限・下限）、除外業種、黒インク要件など。不明な項目は null または省略。
- ai_proposed_flags: 行政書士等独占業務、認定支援機関必須、事後報告義務の3つについて、該当の程度を3段階で判定。
  - high: 明確に該当する（公募要領に明記されている等）
  - medium: 該当の可能性あり（言及はあるが断定しづらい、要確認）
  - none: 該当なし
  - 各フラグについて、根拠となった原文の抜粋を _citation に記載（該当なしの場合は null）。可能性がある場合も根拠があれば citation を記載。`,
  })

  return object
}

const structuredSummarySchema = z.object({
  requirements: z
    .array(z.string())
    .describe("補助金を受けるための要件（応募資格・従業員数・資本金・業種・申請期限など。審査基準は別項目）"),
  screening_criteria: z
    .array(z.string())
    .describe("主な審査基準・審査基準・選定基準の章の内容。見出し直後の項目を漏れなく1項目ずつ抽出"),
  exceptions: z.array(z.string()).describe("除外条件・例外事項"),
  other: z.array(z.string()).describe("その他重要な情報"),
  uncertain: z
    .array(z.string())
    .describe(
      "要件・除外・その他のいずれに分類するか迷った項目、原文が曖昧で解釈が分かれる可能性のある項目。人間が確認するため漏らさず出力すること"
    ),
})

const glossaryCandidateSchema = z.object({
  term: z.string(),
  tooltip: z.string(),
})

const extractionWithGlossarySchema = z.object({
  structured_summary: structuredSummarySchema,
  glossary_terms: z.array(glossaryCandidateSchema).describe("一般の意味と補助金審査での意味が異なる用語のみ"),
})

export type StructuredSummary = z.infer<typeof structuredSummarySchema>
export type GlossaryCandidate = z.infer<typeof glossaryCandidateSchema>

/**
 * 「**■見出し**」形式でテキストを章に分割する。
 * 章の内容は見出しの直後から次の見出しの直前まで。
 */
function parseSections(text: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = []
  const regex = /\*\*■([^*]+?)\*\*/g
  let match: RegExpExecArray | null
  let lastEnd = 0
  let lastTitle = ""

  while ((match = regex.exec(text)) !== null) {
    if (lastTitle) {
      const content = text.slice(lastEnd, match.index).trim()
      if (content) {
        sections.push({ title: lastTitle, content })
      }
    } else {
      const preamble = text.slice(0, match.index).trim()
      if (preamble) {
        sections.push({ title: "概要・前置き", content: preamble })
      }
    }
    lastTitle = match[1].trim()
    lastEnd = match.index + match[0].length
  }
  if (lastTitle) {
    const content = text.slice(lastEnd).trim()
    if (content) {
      sections.push({ title: lastTitle, content })
    }
  }
  return sections
}

const JGRANTS_HEADER = "【jGrants 概要（元）】"
const LINK_PDF_HEADER = "【リンク先・PDFから取得した情報】"

/**
 * jGrants部分とリンク/PDF部分を分離。章立て（**■見出し**）はjGrants固有のため、
 * リンク先・PDFには適用しない。
 */
function splitJgrantsAndLinkPdf(text: string): {
  jgrantsPart: string | null
  linkPdfPart: string | null
} {
  if (!text.includes(JGRANTS_HEADER)) {
    return { jgrantsPart: null, linkPdfPart: null }
  }
  const linkIdx = text.indexOf(LINK_PDF_HEADER)
  const jgrantsEnd = linkIdx >= 0 ? linkIdx : text.length
  const jgrantsPart = text.slice(0, jgrantsEnd).trim()
  const linkPdfPart =
    linkIdx >= 0 ? text.slice(linkIdx).trim() : null
  return { jgrantsPart: jgrantsPart || null, linkPdfPart: linkPdfPart || null }
}

/**
 * 章立てを理解した上でテキストを整形し、章ごとにラベル付きでAIに渡す。
 * jGrants部分のみに適用。リンク/PDF部分はそのまま付加。
 */
function buildSectionedPrompt(truncated: string): {
  hasSections: boolean
  promptText: string
  fullTextForFallback: string | null
} {
  const { jgrantsPart, linkPdfPart } = splitJgrantsAndLinkPdf(truncated)
  if (!jgrantsPart) {
    return { hasSections: false, promptText: truncated, fullTextForFallback: null }
  }
  const sections = parseSections(jgrantsPart)
  if (sections.length === 0) {
    const combined = linkPdfPart ? `${jgrantsPart}\n\n---\n\n${linkPdfPart}` : jgrantsPart
    return { hasSections: false, promptText: combined, fullTextForFallback: null }
  }
  const labeled = sections
    .map((s) => `【セクション: ${s.title}】\n\n${s.content}`)
    .join("\n\n---\n\n")
  const promptText = linkPdfPart
    ? `${labeled}\n\n---\n\n${LINK_PDF_HEADER}\n\n（以下はリンク先・PDFの取得内容。章立てはないためそのまま参照）\n\n${linkPdfPart}`
    : labeled
  return {
    hasSections: true,
    promptText,
    fullTextForFallback: truncated,
  }
}

/**
 * テキストから「補助金受給要件」「例外」「重要情報」を抽出し、
 * 一般意味と補助金審査での意味が異なる用語を用語集候補として抽出
 * 章立て（**■見出し**）がある場合は事前に解析し、章ごとの文脈を付与して精度向上
 */
export async function extractStructuredSummaryAndGlossary(text: string): Promise<{
  structured_summary: StructuredSummary
  glossary_terms: GlossaryCandidate[]
}> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured.")
  }
  const openai = createOpenAI({ apiKey: openaiKey })
  const truncated = text.slice(0, 32000)
  const { hasSections, promptText, fullTextForFallback } = buildSectionedPrompt(truncated)

  const sectionInstruction = hasSections
    ? `【章立て】jGrants部分（上記【セクション: 見出し】）は「**■見出し**」形式で章分けされています。各セクションはその見出しの章の内容です。章の意味を踏まえて（例：「応募資格」→requirements、「主な審査基準」「審査基準」「選定基準」→screening_criteria、「対象外」→exceptions など）適切に抽出してください。リンク先・PDF部分には章立てはなく、そのまま内容を参照してください。
【補足】章に含まれない自由記述があれば、下記【全体テキスト】からも補足抽出してください。

`
    : ""

  const fallbackBlock =
    hasSections && fullTextForFallback
      ? `

【全体テキスト（章に当てはまらない自由記述・取りこぼし補足用）】
${fullTextForFallback}`
      : ""

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: extractionWithGlossarySchema,
    prompt: `公募要領・補助金の説明テキストから以下を抽出してください。
${sectionInstruction}
【テキスト（章ごと）】
${promptText}${fallbackBlock}

【重要】各章（セクション）内の箇条書き・番号付き項目は漏れなく全て抽出すること。要約や統合をせず、1項目ずつ別の配列要素として出力すること。入れ子の箇条書きも、カテゴリ名を冠して各サブ項目を1要素ずつ出力すること（例：「権利: 自らが全部又は一部の権利を保有するIPを…」）。

【出力ルール】
1. structured_summary:
   - requirements: 補助金を受け取るための要件。応募資格の章、従業員数・資本金・業種・申請期限・定義など。審査基準は screening_criteria へ。
   - screening_criteria: 「主な審査基準」「審査基準」「選定基準」の章の全項目を漏れなく。各項目1要素ずつ。入れ子箇条書きもカテゴリ名を冠して抽出（例：「権利: 自らが全部又は…」）。
   - exceptions: 除外条件・例外事項（対象外、対象外となる場合など）。同様に漏れなく。
   - other: その他、申請判断に重要な情報。
   - uncertain: 要件・除外・その他のいずれに当てるか迷った項目。迷ったものは漏らさず uncertain に含めること。

2. glossary_terms: 「一般的な意味」と「補助金・申請審査における意味」が異なる用語のみ。
   - 例: 「小規模事業者」→ 補助金では従業員5人以下等の定義がある
   - 各用語について、税理士が顧客に説明する際に使える簡潔な解説（tooltip）を書く`,
  })

  return object
}

export async function generateUpdateSummary(
  oldText: string,
  newText: string
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured.")
  }
  const openai = createOpenAI({ apiKey: openaiKey })

  const schema = z.object({ summary: z.string() })
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema,
    prompt: `公募要領の旧版と新版を比較し、主な変更点を2〜3文で要約してください。日本語で簡潔に。

【旧テキスト（抜粋）】
${oldText.slice(0, 4000)}

【新テキスト（抜粋）】
${newText.slice(0, 4000)}

summary に変更点要約のみを出力。`,
  })

  return object.summary ?? ""
}
