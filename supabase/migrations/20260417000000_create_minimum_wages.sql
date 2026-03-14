-- 時限式・最低賃金マスター（都道府県ごと、適用開始日付き）
CREATE TABLE IF NOT EXISTS public.minimum_wages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture text NOT NULL,
  hourly_wage integer NOT NULL,
  effective_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS minimum_wages_prefecture_effective_idx 
  ON public.minimum_wages (prefecture, effective_date DESC);

COMMENT ON TABLE public.minimum_wages IS '都道府県別最低賃金マスター（時限式・適用開始日で有効期間管理）';
