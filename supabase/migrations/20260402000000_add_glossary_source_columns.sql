-- 用語の登録元・ソース・判断要因を追跡
ALTER TABLE public.glossaries ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE public.glossaries ADD COLUMN IF NOT EXISTS source_detail text;
ALTER TABLE public.glossaries ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.glossaries ADD COLUMN IF NOT EXISTS judgment_factor text;

COMMENT ON COLUMN public.glossaries.source_type IS '登録者: ai | manual';
COMMENT ON COLUMN public.glossaries.source_detail IS 'ソース: 補助金名・リンク先取得/PDF解析/手動登録 など';
COMMENT ON COLUMN public.glossaries.source_url IS '情報源URL（PDF・リンク先など）。クリックで開く';
COMMENT ON COLUMN public.glossaries.judgment_factor IS 'AI抽出の場合: 判断した要因（一般意味と補助金審査での意味が異なる 等）';
