-- add pdf_url, pdf_raw_text, structured_requirements, ai_update_summary, ai_proposed_flags to subsidies
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS pdf_raw_text text;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS structured_requirements jsonb;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS ai_update_summary text;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS ai_proposed_flags jsonb;

COMMENT ON COLUMN public.subsidies.pdf_url IS '公募要領PDFのURL';
COMMENT ON COLUMN public.subsidies.pdf_raw_text IS 'PDFから抽出した生テキスト';
COMMENT ON COLUMN public.subsidies.structured_requirements IS 'AI抽出の構造化要件（資本金・従業員数・除外業種等）';
COMMENT ON COLUMN public.subsidies.ai_update_summary IS 'AI生成の変更点要約';
COMMENT ON COLUMN public.subsidies.ai_proposed_flags IS '3警告フラグに対するAI推奨値';
