# AI利用一覧：どこでどのモデルを使っているか

プロジェクト内の OpenAI API 利用箇所と、各モデルの性能・用途の一覧です。

---

## 一覧表

| 用途 | ファイル | 関数/処理 | モデル | 性能・備考 |
|------|----------|-----------|--------|------------|
| **補助金テキストの3フラグ判定** | `src/lib/subsidy-ai-parser.ts` | `analyzeSubsidyText` | **gpt-4o** | 高精度。行政書士独占・認定支援機関・事後報告の判定＋根拠引用 |
| **AI構造化（要件・審査基準・除外・用語）** | `src/lib/subsidy-ai-parser.ts` | `extractStructuredSummaryAndGlossary` | **gpt-4o** | 高精度。章立てを考慮した要件・審査基準・除外・uncertain・用語集の抽出 |
| **公募要領の変更点要約** | `src/lib/subsidy-ai-parser.ts` | `generateUpdateSummary` | **gpt-4o** | 旧版と新版の差分要約 |
| **スクリーニング（補助金推薦）** | `src/app/(dashboard)/screenings/actions.ts` | 推薦AI | **gpt-4o-mini** | コスト重視。顧客情報と補助金を突き合わせて推薦・理由・次の質問を生成 |
| **知識ベース検索（アンサンブル）** | `src/lib/knowledge/ensemble-pipeline.ts` | 複数エージェント＋集約＋Critic | **gpt-4o-mini** | コスト・速度重視。RAGの回答生成・集約・批判的評価 |
| **知識ベース用LLMクライアント** | `src/lib/knowledge/implementations/openai-llm-client.ts` | デフォルト | **gpt-4o-mini** | 上記パイプライン等から利用。未指定時は mini |
| **メタ学習（Criticプロンプト改善）** | `src/lib/knowledge/meta-learning.ts` | 人間の修正差分からプロンプト改善 | **gpt-4o-mini** | 管理機能。見逃しを防ぐ評価指示の追加 |
| **埋め込み（ベクトル化）** | `src/lib/knowledge/embedding.ts` | `embedText` | **text-embedding-3-small** | 埋め込み専用。検索・RAGのベクトル化に使用 |

---

## モデル別の性能・コスト目安

| モデル | 性能 | コスト目安（1Mトークン） | 主な用途 |
|--------|------|--------------------------|----------|
| **gpt-4o** | 高精度・推論が強い | Input $2.50 / Output $10 | 補助金の構造化・3フラグ判定・変更要約 |
| **gpt-4o-mini** | 中〜高、コスト効率良い | Input $0.15 / Output $0.60 | スクリーニング推薦、知識検索、メタ学習 |
| **text-embedding-3-small** | 埋め込み用 | $0.02/1Mトークン | 知識チャンク・検索のベクトル化 |

---

## 3フラグ判定の動作確認

フラグが立つ補助金が少ない場合のチェック用：

```bash
npm run test:3flags
```

`scripts/test-3flags.ts` が、認定支援機関必須・事後報告義務・行政書士独占の各パターンのテストテキストで判定を実行します。フラグが正しく ON になるか確認できます。

**フラグが立ちやすい補助金例**（jGrants で検索して試すとよい）:
- **認定支援機関必須**: デジタル化・AI導入補助金、IT導入補助金
- **事後報告義務**: 多くの補助金で実績報告・事後報告が必須
- **行政書士独占**: 申請書類作成に行政書士業務が含まれる補助金

---

## 変更したい場合

- **補助金まわり（高精度）**: `src/lib/subsidy-ai-parser.ts` の `openai("gpt-4o")` を変更
- **スクリーニング・知識検索**: 各ファイルの `gpt-4o-mini` を `gpt-4o` にすると精度向上・コスト増
- **埋め込み**: `src/lib/knowledge/embedding.ts` の `text-embedding-3-small`（`text-embedding-3-large` にすると高精度・高コスト）
