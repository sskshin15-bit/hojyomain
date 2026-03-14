-- 指定補助金のリンク先取得・AI構造化データをリセット
-- 「もう一度リンク先を取得」で再取得できるようになる
-- 実行: Supabase SQL Editor でこのファイルの内容を実行

UPDATE public.subsidies
SET
  source_extracts = NULL,
  description_from_sources = NULL,
  description_merged = NULL,
  structured_summary = NULL,
  structured_requirements = NULL,
  ai_proposed_flags = NULL
WHERE name ILIKE '%IP360%海外展開支援%プロモーション%';
