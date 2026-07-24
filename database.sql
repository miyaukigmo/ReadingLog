-- 既存のテーブルをリセット（もし既に作成済みの場合）
drop table if exists public.review_logs cascade;
drop table if exists public.items cascade;
drop table if exists public.sections cascade;
drop table if exists public.documents cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- documents table (user_id 削除)
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  title text not null,
  authors jsonb default '[]'::jsonb,
  categories jsonb default '[]'::jsonb,
  summary text,
  notebook_lm_report text,
  key_points jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- sections table
create table public.sections (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  title text not null,
  summary text,
  sort_order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- items table
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references public.sections(id) on delete cascade,
  title text not null,
  summary text,
  detail text,
  review_prompt text,
  review_enabled boolean default true,
  keywords jsonb default '[]'::jsonb,
  sort_order integer not null,
  verification_status text default 'unverified' check (verification_status in ('unverified', 'verified')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- review_logs table (user_id 削除)
create table public.review_logs (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  result text not null check (result in ('understood', 'uncertain', 'forgot')),
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.documents enable row level security;
alter table public.sections enable row level security;
alter table public.items enable row level security;
alter table public.review_logs enable row level security;

-- 認証なしで全ての操作を許可するポリシー（MVP・個人用）
create policy "Allow all actions for anon users on documents" on public.documents
  for all using (true) with check (true);

create policy "Allow all actions for anon users on sections" on public.sections
  for all using (true) with check (true);

create policy "Allow all actions for anon users on items" on public.items
  for all using (true) with check (true);

create policy "Allow all actions for anon users on review_logs" on public.review_logs
  for all using (true) with check (true);
