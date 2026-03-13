-- 顧問先（clients）テーブルの作成
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- 企業名
  industry text, -- 業種
  employees integer, -- 従業員数
  capital text, -- 資本金
  status text default '未対応', -- 対応ステータス（例：要件確認中、提案書作成待ち）
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- セキュリティ設定（今回はプロトタイプなので一旦全て許可します）
alter table public.clients enable row level security;
create policy "Allow public read and write" on public.clients for all using (true);
