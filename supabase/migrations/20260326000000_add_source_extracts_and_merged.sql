-- source_extracts: リンク/PDF取得元のメタデータと抽出テキスト
-- description_from_sources: リンク/PDFから取得した内容の結合
-- description_merged: 元の概要 + リンク/PDF内容を統合した見やすい概要
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS source_extracts jsonb;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS description_from_sources text;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS description_merged text;

COMMENT ON COLUMN public.subsidies.source_extracts IS 'リンク/PDF取得元のメタデータ（URL・取得日時・ステータス・抽出テキスト）';
COMMENT ON COLUMN public.subsidies.description_from_sources IS 'リンク/PDFから取得した内容のみの結合';
COMMENT ON COLUMN public.subsidies.description_merged IS '元の概要 + リンク/PDF内容を統合した見やすい概要';
