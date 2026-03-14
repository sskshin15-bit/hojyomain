-- コールドストレージ移送: deprecated 一定期間経過後にアーカイブへ移送

CREATE OR REPLACE FUNCTION archive_deprecated_chunks(deprecated_days int DEFAULT 30)
RETURNS int AS $$
DECLARE
  cnt int;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, content, content_hash, source, status, summary, keywords
    FROM knowledge_chunks
    WHERE status = 'deprecated'
      AND updated_at < now() - (deprecated_days || ' days')::interval
  LOOP
    INSERT INTO knowledge_chunks_archive (id, content, content_hash, source, status, summary, keywords, archived_at)
    VALUES (r.id, r.content, r.content_hash, r.source, r.status, r.summary, r.keywords, now())
    ON CONFLICT (id) DO UPDATE SET
      content = EXCLUDED.content,
      content_hash = EXCLUDED.content_hash,
      source = EXCLUDED.source,
      status = EXCLUDED.status,
      summary = EXCLUDED.summary,
      keywords = EXCLUDED.keywords,
      archived_at = now();
  END LOOP;

  DELETE FROM knowledge_chunks
  WHERE status = 'deprecated'
    AND updated_at < now() - (deprecated_days || ' days')::interval;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql;
