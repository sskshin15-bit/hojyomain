-- 代表者名（社長の苗字など）を追加
alter table public.clients add column if not exists ceo_name text;
