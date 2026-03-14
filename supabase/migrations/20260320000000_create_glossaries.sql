-- Step 9: 実務用語辞書（Glossary）
create table if not exists public.glossaries (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  user_tooltip text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists glossaries_term_idx on public.glossaries (term);

alter table public.glossaries enable row level security;

drop policy if exists "Allow public read glossaries" on public.glossaries;
create policy "Allow public read glossaries"
  on public.glossaries for select using (true);
