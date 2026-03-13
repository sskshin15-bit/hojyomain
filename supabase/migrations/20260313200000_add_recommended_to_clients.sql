-- AI推論結果（補助金名・見込み金額）を保存するカラムを追加
alter table public.clients add column if not exists recommended_subsidy text;
alter table public.clients add column if not exists recommended_amount text;
