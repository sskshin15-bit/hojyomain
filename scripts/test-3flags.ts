/**
 * 3フラグ判定の動作確認用スクリプト
 * 実行: npx tsx scripts/test-3flags.ts
 * （事前に .env.local を読み込むか OPENAI_API_KEY を export してください）
 *
 * 明確にフラグが立つ想定のテストテキストで analyzeSubsidyText を実行し、
 * 結果を表示します。
 */
import { readFileSync, existsSync } from "fs"
import { join } from "path"
// .env.local を読み込み
const envPath = join(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) {
      const v = m[2].replace(/^["']|["']$/g, "").trim()
      if (v) process.env[m[1].trim()] = v
    }
  }
}
import { analyzeSubsidyText } from "../src/lib/subsidy-ai-parser"

const TEST_TEXTS = {
  certified_agency: `デジタル化・AI導入補助金の申請には、IT導入支援事業者（認定支援機関）との
パートナーシップが必須です。申請者は、経済産業省が認定したIT導入支援事業者から
サポートを受けながら申請を行う必要があります。`,

  post_report: `補助金交付後、事業完了から3ヶ月以内に実績報告書を提出してください。
事後報告を怠った場合、補助金の返還を求める場合があります。`,

  exclusive: `本補助金の申請書類作成は、行政書士法に基づく独占業務に該当する恐れがあります。
税理士のみで申請書類を作成する場合は、行政書士との連携をご検討ください。`,
}

async function main() {
  console.log("=== 3フラグ判定 動作テスト ===\n")

  for (const [name, text] of Object.entries(TEST_TEXTS)) {
    console.log(`【テスト: ${name}】`)
    console.log("入力:", text.slice(0, 80) + "...")
    try {
      const result = await analyzeSubsidyText(text)
      const f = result.ai_proposed_flags
      console.log("結果:")
      console.log("  行政書士独占:", f.is_exclusive_to_scrivener, f.is_exclusive_to_scrivener_citation ? `「${f.is_exclusive_to_scrivener_citation.slice(0, 40)}...」` : "")
      console.log("  認定支援機関必須:", f.requires_certified_agency, f.requires_certified_agency_citation ? `「${f.requires_certified_agency_citation.slice(0, 40)}...」` : "")
      console.log("  事後報告義務:", f.has_post_grant_reporting, f.has_post_grant_reporting_citation ? `「${f.has_post_grant_reporting_citation.slice(0, 40)}...」` : "")
      console.log("")
    } catch (e) {
      console.error("エラー:", e)
      console.log("")
    }
  }

  console.log("=== テスト終了 ===")
}

main()
