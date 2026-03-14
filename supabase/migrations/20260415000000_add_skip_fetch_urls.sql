-- 人間が「リンク切れ」「参照不要」とマークしたURLを次回以降取得しないため
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS skip_fetch_urls text[] DEFAULT NULL;
COMMENT ON COLUMN public.subsidies.skip_fetch_urls IS 'リンク切れ・参照不要としてマークされたURL。次回リンク取得時にスキップする';
