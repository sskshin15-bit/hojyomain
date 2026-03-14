-- AI抽出の構造化要約（要件・例外・その他重要事項）
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS structured_summary jsonb;

COMMENT ON COLUMN public.subsidies.structured_summary IS 'AI抽出: 補助金受給要件、除外条件・例外、その他重要事項の構造化表示用';
