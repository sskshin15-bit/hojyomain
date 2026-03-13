-- Supabase ダッシュボードの [SQL エディタ] に貼り付けて実行してください。
-- 既に適用済みのマイグレーションは "if not exists" でスキップされます。

-- 複数補助金候補を保存する jsonb カラムを追加
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS recommended_subsidies jsonb DEFAULT '[]'::jsonb;
