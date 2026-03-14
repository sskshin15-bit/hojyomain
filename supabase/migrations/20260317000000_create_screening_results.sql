-- スクリーニング結果の不変スナップショット保存
-- 公募要領変更後の「言った・言わない」トラブル防止のため、判定根拠を完全保存

CREATE TABLE IF NOT EXISTS public.screening_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  snapshot_subsidy_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot_ai_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.screening_results IS 'AI判定時の補助金データ・AI応答のスナップショット。法的リスク防衛用';
COMMENT ON COLUMN public.screening_results.snapshot_subsidy_data IS '推論時にAIに渡した補助金データ（JSONB）';
COMMENT ON COLUMN public.screening_results.snapshot_ai_response IS 'AI生成結果全文（JSONB）';

ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert" ON public.screening_results;
CREATE POLICY "Allow anon insert" ON public.screening_results FOR INSERT TO anon WITH CHECK (true);
