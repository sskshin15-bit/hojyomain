-- 自己成長型・非同期アンサンブルAI知識管理システム
-- Step 1: データベース・スキーマ設計

-- pgvector 拡張
CREATE EXTENSION IF NOT EXISTS vector;

-- 4.1 ナレッジDB（Vector）
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(1536),
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  parent_id uuid REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'needs_review')),
  summary text,
  keywords text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_chunks_content_hash_idx ON knowledge_chunks(content_hash);
CREATE INDEX IF NOT EXISTS knowledge_chunks_status_idx ON knowledge_chunks(status);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks(source);

-- HNSW: 空テーブルでも作成可能。ivfflat は行数 >= lists が必要なため初期は不向き
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL AND status = 'active';

COMMENT ON TABLE knowledge_chunks IS 'ナレッジチャンク（Vector検索用）。親ドキュメント要約付き、content_hashで冪等Upsert';

-- 4.2 ジョブDB
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
CREATE INDEX IF NOT EXISTS knowledge_jobs_created_idx ON knowledge_jobs(created_at);

COMMENT ON TABLE knowledge_jobs IS '非同期ジョブ。current_stepでレジューム可能';

-- 4.3 システムプロンプトDB（Critic動的管理）
CREATE TABLE IF NOT EXISTS system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_prompts IS 'Critic等のシステムプロンプト動的管理（メタ学習で更新）';

-- 4.4 DLQ
CREATE TABLE IF NOT EXISTS dlq_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id uuid NOT NULL UNIQUE,
  failed_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  input_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dlq_jobs IS 'リトライ上限到達ジョブの隔離';

-- 4.5 アーカイブ（コールドストレージ）
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

COMMENT ON TABLE knowledge_chunks_archive IS 'deprecated一定期間経過後のコールドストレージ';
