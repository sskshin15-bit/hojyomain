-- Phase 5: 採択金額と決済計算

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS grant_amount numeric;
COMMENT ON COLUMN public.projects.grant_amount IS '補助金採択金額（円）';
