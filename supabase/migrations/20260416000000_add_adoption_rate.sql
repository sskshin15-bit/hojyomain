-- 補助金の採択率（人が入力）。AI判定のおすすめ表示で表示
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS adoption_rate text DEFAULT NULL;
COMMENT ON COLUMN public.subsidies.adoption_rate IS '採択率（例: 45%, 約30%）';
