-- Vector 検索・deprecate 用 RPC
-- cosine distance: <=> (1 = orthogonal, 0 = identical). similarity = 1 - distance

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  content text,
  content_hash text,
  source text,
  status text,
  summary text,
  keywords text[],
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.content_hash,
    kc.source,
    kc.status,
    kc.summary,
    kc.keywords,
    (1 - (kc.embedding <=> query_embedding))::float AS similarity
  FROM knowledge_chunks kc
  WHERE kc.status = 'active'
    AND kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 類似度閾値超えの既存チャンクを deprecated に論理削除
CREATE OR REPLACE FUNCTION deprecate_similar_chunks(
  query_embedding vector(1536),
  sim_threshold float,
  exclude_hash text DEFAULT NULL
)
RETURNS int AS $$
DECLARE
  cnt int;
BEGIN
  UPDATE knowledge_chunks
  SET status = 'deprecated', updated_at = now()
  WHERE status = 'active'
    AND embedding IS NOT NULL
    AND (exclude_hash IS NULL OR content_hash != exclude_hash)
    AND (1 - (embedding <=> query_embedding)) >= sim_threshold;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql;
