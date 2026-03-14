-- マスター仕様: subsidies に status, ai_memo, 警告フラグ等を追加
-- 既存の is_active は残し、status で運用。status 未設定の既存行は published に寄せる

ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS ai_memo text;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS flags_reviewed boolean DEFAULT false;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS is_exclusive_to_scrivener boolean DEFAULT false;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS requires_certified_agency boolean DEFAULT false;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS has_post_grant_reporting boolean DEFAULT false;

-- 既存行: is_active=true なら status='published'、false なら 'archived'
UPDATE public.subsidies
SET status = CASE WHEN is_active = true THEN 'published' ELSE 'archived' END
WHERE status IS NULL;

-- 新規同期用デフォルト
ALTER TABLE public.subsidies ALTER COLUMN status SET DEFAULT 'draft';

COMMENT ON COLUMN public.subsidies.status IS 'draft: 未確認, needs_review: 要確認, published: 公開中, archived: アーカイブ';
COMMENT ON COLUMN public.subsidies.flags_reviewed IS '管理者が3警告フラグを確認・確定したか';
COMMENT ON COLUMN public.subsidies.is_exclusive_to_scrivener IS '行政書士等の独占業務に該当する恐れ';
COMMENT ON COLUMN public.subsidies.requires_certified_agency IS '認定支援機関必須';
COMMENT ON COLUMN public.subsidies.has_post_grant_reporting IS '事後報告義務';
