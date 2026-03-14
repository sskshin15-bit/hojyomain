-- Step 10: 専門家エスカレーション用フラグ
ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS needs_expert_review boolean DEFAULT false;
COMMENT ON COLUMN public.screening_results.needs_expert_review IS 'confidence_score < 80 or needs_human_help のとき true（専門家レビュー待ち）';
