-- 排他制御: 1件の pending ジョブを取得して processing に更新

CREATE OR REPLACE FUNCTION claim_next_knowledge_job()
RETURNS TABLE (
  job_id uuid,
  status text,
  current_step text,
  input_data jsonb,
  result_data jsonb,
  retry_count int,
  max_retries int,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT j.job_id, j.status, j.current_step, j.input_data, j.result_data,
         j.retry_count, j.max_retries, j.error_message, j.created_at, j.updated_at
  INTO r
  FROM knowledge_jobs j
  WHERE j.status = 'pending'
  ORDER BY j.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF r.job_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE knowledge_jobs
  SET status = 'processing', updated_at = now()
  WHERE knowledge_jobs.job_id = r.job_id;

  RETURN QUERY SELECT
    r.job_id, 'processing'::text, r.current_step, r.input_data, r.result_data,
    r.retry_count, r.max_retries, r.error_message, r.created_at, now();
END;
$$ LANGUAGE plpgsql;
