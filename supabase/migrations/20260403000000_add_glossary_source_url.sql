-- 情報源URL（PDF・リンク先へ直接遷移用）
ALTER TABLE public.glossaries ADD COLUMN IF NOT EXISTS source_url text;
COMMENT ON COLUMN public.glossaries.source_url IS '情報源URL（PDF・リンク先など）。クリックで開く';
