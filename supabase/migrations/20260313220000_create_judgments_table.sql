-- 補助金判定結果・回答履歴を保存するテーブル
create table if not exists public.judgments (
  id uuid default gen_random_uuid() primary key,
  subsidy_id text not null,
  subsidy_name text not null,
  status text not null check (status in ('success', 'failure')),
  message text,
  todo_list jsonb default '[]'::jsonb,
  answers jsonb default '[]'::jsonb,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.judgments enable row level security;
create policy "Allow all for judgments" on public.judgments for all using (true) with check (true);
