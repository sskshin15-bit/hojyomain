# 自己成長型・非同期アンサンブルAI知識管理システム アーキテクチャ設計書

## 1. 概要

複数AIによるアンサンブル推論・相互評価（Critic）・人間フィードバック（HITL）を統合した動的知識管理システム。  
補助金要件判定ドメインを対象に、**非同期バックグラウンド処理**で推論・ナレッジ更新を行う。

---

## 2. 技術スタック（既存準拠）

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| DB | Supabase (PostgreSQL + pgvector) |
| 構造化出力 | Zod |
| LLM | OpenAI (AI SDK) |
| デプロイ | Vercel |
| バックグラウンド処理 | Supabase + Vercel Cron / Inngest |

---

## 3. システム全体のデータフロー

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              クライアント / 管理UI                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  API (Next.js Route Handlers)                                                             │
│  - POST /api/knowledge/jobs    → HTTP 202 + job_id（即座に返却）                           │
│  - GET  /api/knowledge/jobs/:id → ジョブ状態取得                                            │
│  - POST /api/knowledge/query   → Retrieval→Ensemble→Aggregator→Critic 実行                 │
│  - POST /api/knowledge/feedback → 人間修正（HITL）→ メタ学習トリガー                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  ジョブテーブル (jobs)                                                                      │
│  status: pending → processing → completed / failed / dlq                                    │
│  current_step でレジューム可能                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│  Worker (Cron /       │   │  Document Parser      │   │  Vector DB             │
│  Inngest Function)    │   │  (Unstructured API    │   │  (pgvector)            │
│                       │   │   または pdf-parse)   │   │  Contextual Retrieval  │
│  1. ドキュメント取得   │──▶│  構造維持型PDF解析    │──▶│  content_hash 冪等     │
│  2. チャンク分割      │   │                       │   │  類似度で deprecated   │
│  3. 親要約付与        │   │                       │   │  アーカイブ移送        │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  アンサンブル推論パイプライン（非同期・ステートマシン）                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   │
│  │ Ensemble    │   │ Aggregator  │   │ Critic      │   │ 修正ループ   │                   │
│  │ (並列推論)   │──▶│ (統合AI)    │──▶│ (3基準評価) │──▶│ Max 2回     │                   │
│  │ Prompt Cache│   │ Structured  │   │             │   │ 超過→needs_ │                   │
│  └─────────────┘   └─────────────┘   └─────────────┘   │  review     │                   │
│                                                         └─────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  メタ学習 (HITL フィードバック受信時)                                                        │
│  人間の修正差分 → 差分解析AI → Criticプロンプト改善 → system_prompts 更新                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  DLQ (Dead Letter Queue) / アーカイブ                                                      │
│  - リトライ上限到達ジョブ → dlq_jobs へ移送                                                │
│  - deprecated 一定期間経過 → archive テーブルへ移送                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. DBスキーマ

### 4.1 ナレッジDB（Vector / pgvector）

```sql
-- pgvector 拡張
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  content_hash text NOT NULL UNIQUE,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  parent_id uuid REFERENCES knowledge_chunks(id),
  source text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'needs_review')),
  summary text,
  keywords text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_chunks_content_hash_idx ON knowledge_chunks(content_hash);
CREATE INDEX IF NOT EXISTS knowledge_chunks_status_idx ON knowledge_chunks(status);
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL AND status = 'active';
```

### 4.2 ジョブDB

```sql
CREATE TABLE IF NOT EXISTS knowledge_jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dlq')),
  current_step text NOT NULL DEFAULT 'init',
  input_data jsonb NOT NULL DEFAULT '{}',
  result_data jsonb,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_jobs_status_idx ON knowledge_jobs(status);
```

### 4.3 システムプロンプトDB（Critic動的管理）

```sql
CREATE TABLE IF NOT EXISTS system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.4 DLQ

```sql
CREATE TABLE IF NOT EXISTS dlq_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id uuid NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  input_data jsonb,
  UNIQUE(original_job_id)
);
```

### 4.5 アーカイブ（コールドストレージ）

```sql
CREATE TABLE IF NOT EXISTS knowledge_chunks_archive (
  id uuid PRIMARY KEY,
  content text NOT NULL,
  content_hash text NOT NULL,
  source text NOT NULL,
  status text NOT NULL,
  summary text,
  keywords text[],
  archived_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. ディレクトリ構造（新規追加分）

```
src/
├── lib/
│   ├── knowledge/                    # 新規: 知識管理モジュール
│   │   ├── adapters/                 # Adapter/Repository パターン
│   │   │   ├── document-parser.ts    # PDF/HTML解析インターフェース
│   │   │   ├── llm-client.ts         # LLM呼び出し（Prompt Caching対応）
│   │   │   ├── vector-store.ts       # pgvector 操作
│   │   │   └── job-repository.ts     # ジョブCRUD
│   │   ├── parsers/
│   │   │   └── unstructured.ts       # Unstructured API / pdf-parse ラッパー
│   │   ├── state-machine/            # レジューム可能ステートマシン
│   │   │   ├── steps.ts
│   │   │   └── executor.ts
│   │   ├── schemas/                  # Zod構造化出力
│   │   │   ├── ensemble.ts
│   │   │   ├── aggregator.ts
│   │   │   └── critic.ts
│   │   └── meta-learning.ts          # Criticプロンプト動的更新
│   └── ... (既存)
├── app/
│   ├── api/
│   │   └── knowledge/
│   │       ├── jobs/
│   │       │   ├── route.ts          # POST: ジョブ作成 → 202
│   │       │   └── [jobId]/
│   │       │       └── route.ts      # GET: ジョブ状態
│   │       └── feedback/
│   │           └── route.ts          # POST: HITL修正 → メタ学習
│   └── cron/
│       └── process-knowledge-jobs/
│           └── route.ts              # ワーカー（Cron呼び出し）
├── app/(admin)/
│   └── admin/
│       └── knowledge/                # 新規: 管理ダッシュボード
│           ├── page.tsx              # ジョブ監視・DLQ・ナレッジCRUD
│           └── actions.ts
docs/
└── architecture.md                   # 本ドキュメント
```

---

## 6. セーフガード対応一覧

| 要件 | 実装方針 |
|------|----------|
| Structured Outputs | 全LLM出力をZodスキーマで検証、JSON固定 |
| レジューム可能ステートマシン | `current_step` + 冪等ステップ設計 |
| Adapter/Repository | `document-parser.ts`, `llm-client.ts`, `vector-store.ts` で抽象化、DI |
| 排他制御 | `SELECT ... FOR UPDATE` でジョブ取得時ロック |
| Exponential Backoff | リトライ時に `retry_count` に応じ待機時間算出 |
| Max Turns (2回) | Aggregator↔Critic ループ回数をカウンタで制限 |
| Contextual Retrieval | チャンク保存時、親ドキュメント要約を先頭に付与 |
| 冪等性 | `content_hash` で Upsert |
| Safe Deprecation | 類似度閾値超えで `status=deprecated`、物理削除禁止 |
| コールドストレージ | deprecated 一定期間経過後、`knowledge_chunks_archive` へ移送バッチ |
| DLQ | リトライ上限到達時 `dlq_jobs` へ移送 |
| 構造化ログ | `job_id`, `step`, `error` をJSON形式で出力（LangSmith連携は将来拡張） |

### 6.1 Critic 評価基準（3軸）

| 基準 | 内容 |
|------|------|
| 忠実性 | ソース知識・要件文との整合性。捏造・過剰解釈の有無 |
| 関連性 | 質問・文脈との適合度。逸脱や無関係な記述の有無 |
| 論理性 | 結論への論理的一貫性。矛盾・飛躍の有無 |

### 6.2 メタ学習（DSPy的アプローチ）

人間の修正差分（original vs corrected）をメタAIに渡し、以下のフローで Critic の `system_prompts.prompt_text` を動的更新する：

1. **差分抽出:** 人間が修正した箇所を diff として抽出
2. **弱点推定:** メタAIが「どの基準（忠実性/関連性/論理性）でCriticが見逃したか」を分析
3. **プロンプト改善:** 見逃しパターンに基づき Critic の評価指示を具体化・追加
4. **version 更新:** `system_prompts` に新レコード挿入（`version` インクリメント）

---

## 7. テスト方針（TDD / モック）

| 対象 | 方針 |
|------|------|
| ステートマシン | 各 `current_step` の遷移・リトライシナリオをユニットテスト |
| 排他制御 | `FOR UPDATE` による二重取得防止をモックDBで検証 |
| DLQ移送 | リトライ上限到達時の `dlq_jobs` 挿入を検証 |
| LLM / Vector DB | テスト時はモック化し、API課金をゼロに |

---

## 8. 外部API・追加依存

| 用途 | 候補 | 備考 |
|------|------|------|
| 構造維持型PDF解析 | Unstructured API / LlamaParse API | REST APIでNodeから呼び出し |
| Embedding | OpenAI text-embedding-3-small | 既存 OpenAI 契約で利用 |
| バックグラウンドワーカー | Vercel Cron → API | または Inngest 導入 |

---

## 9. 既存システムとの統合方針

- **subsidies テーブル** は現状維持。jGrants同期・補助金管理は既存のまま。
- **knowledge_chunks** は補助金要件・公募要領テキストのチャンクを格納。`source` に `subsidy_id` 等を紐付け可能。
- 既存の `structured_requirements`, `ai_proposed_flags` フローは、本パイプラインの「回答」として活用可能（段階的移行）。

---

## 10. 合意チェックリスト

本設計書で合意いただく項目：

- [ ] 技術スタック（Next.js + Supabase + Zod）の維持
- [ ] pgvector によるベクトル検索の採用
- [ ] ジョブキューを Supabase テーブル + Cron で実装（Inngest は任意）
- [ ] PDF解析に Unstructured API または LlamaParse API を外部RESTで利用
- [ ] ディレクトリ構造（`src/lib/knowledge/` 以下）

合意いただけましたら、**Step 1: データベース・スキーマ設計** に進みます。
