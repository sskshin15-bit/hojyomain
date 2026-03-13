-- 複数補助金候補を保存する jsonb カラムを追加
alter table public.clients add column if not exists recommended_subsidies jsonb default '[]'::jsonb;
