-- subsidies テーブルに api_id カラムを追加し、外部API連携時の upsert キーとする
-- 既存の手動登録データは api_id が null のまま（PostgreSQL では複数 null は UNIQUE で許可される）
-- 部分 UNIQUE だと Supabase の upsert onConflict で使えないため、通常の UNIQUE を使用
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS api_id text;

DROP INDEX IF EXISTS public.subsidies_api_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS subsidies_api_id_key ON public.subsidies (api_id);
