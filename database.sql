-- 既存のテーブルをリセット（もし既に作成済みの場合）
drop table if exists public.review_logs cascade;
drop table if exists public.connections cascade;
drop table if exists public.items cascade;
drop table if exists public.sections cascade;
drop table if exists public.documents cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- documents table
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  purpose text not null default 'study' check (purpose in ('study', 'archive')),
  type text not null check (type in ('book', 'paper', 'article', 'report', 'lecture', 'novel', 'essay', 'anime_impressions', 'personal_writing', 'other')),
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
  original_text text not null default '',
  archive_report text not null default '',
  keywords jsonb not null default '[]'::jsonb,
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
  review_enabled boolean default false,
  keywords jsonb default '[]'::jsonb,
  sort_order integer not null,
  verification_status text default 'unverified' check (verification_status in ('unverified', 'verified')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- connections table
create table public.connections (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  type text not null check (type in ('field', 'concept', 'person', 'book', 'paper', 'research_topic', 'work', 'other')),
  title text not null,
  connection text not null default '',
  question text not null default '',
  starting_points jsonb not null default '[]'::jsonb,
  search_keywords jsonb not null default '[]'::jsonb,
  basis text not null default 'inferred' check (basis in ('direct', 'inferred', 'external')),
  sort_order integer not null default 0,
  is_favorite boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- review_logs table
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
alter table public.connections enable row level security;
alter table public.review_logs enable row level security;

-- 認証なしで全ての操作を許可するポリシー（MVP・個人用）
create policy "Allow all actions for anon users on documents" on public.documents
  for all using (true) with check (true);

create policy "Allow all actions for anon users on sections" on public.sections
  for all using (true) with check (true);

create policy "Allow all actions for anon users on items" on public.items
  for all using (true) with check (true);

create policy "Allow all actions for anon users on connections" on public.connections
  for all using (true) with check (true);

create policy "Allow all actions for anon users on review_logs" on public.review_logs
  for all using (true) with check (true);

-- バックアップ復元用RPC
-- トランザクションとして実行され、エラー発生時は自動的にロールバックされます
create or replace function public.restore_full_backup(backup_data jsonb)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  doc_count int;
  sec_count int;
  item_count int;
  conn_count int;
  log_count int;
begin
  -- 1. 検証: IDの重複チェック (JSON配列内のIDを集計)
  if (
    select count(id) != count(distinct id) 
    from jsonb_to_recordset(backup_data->'documents') as x(id uuid)
  ) then
    raise exception 'documentsの中に重複したIDが存在します';
  end if;

  if (
    select count(id) != count(distinct id) 
    from jsonb_to_recordset(backup_data->'sections') as x(id uuid)
  ) then
    raise exception 'sectionsの中に重複したIDが存在します';
  end if;

  if (
    select count(id) != count(distinct id) 
    from jsonb_to_recordset(backup_data->'items') as x(id uuid)
  ) then
    raise exception 'itemsの中に重複したIDが存在します';
  end if;

  if (
    select count(id) != count(distinct id) 
    from jsonb_to_recordset(backup_data->'connections') as x(id uuid)
  ) then
    raise exception 'connectionsの中に重複したIDが存在します';
  end if;

  if (
    select count(id) != count(distinct id) 
    from jsonb_to_recordset(backup_data->'reviewLogs') as x(id uuid)
  ) then
    raise exception 'reviewLogsの中に重複したIDが存在します';
  end if;

  -- 2. 検証: Enum値のチェック
  if exists (
    select 1 from jsonb_to_recordset(backup_data->'documents') as x(purpose text, type text)
    where x.purpose not in ('study', 'archive')
       or x.type not in ('book', 'paper', 'article', 'report', 'lecture', 'novel', 'essay', 'anime_impressions', 'personal_writing', 'other')
  ) then
    raise exception 'documentsのpurposeまたはtypeに不正な値が含まれています';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(backup_data->'connections') as x(type text, basis text)
    where x.type not in ('field', 'concept', 'person', 'book', 'paper', 'research_topic', 'work', 'other')
       or x.basis not in ('direct', 'inferred', 'external')
  ) then
    raise exception 'connectionsのtypeまたはbasisに不正な値が含まれています';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(backup_data->'items') as x(verification_status text)
    where x.verification_status not in ('unverified', 'verified')
  ) then
    raise exception 'itemsのverification_statusに不正な値が含まれています';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(backup_data->'reviewLogs') as x(result text)
    where x.result not in ('understood', 'uncertain', 'forgot')
  ) then
    raise exception 'reviewLogsのresultに不正な値が含まれています';
  end if;

  -- 3. 検証: 参照整合性のチェック
  -- sections.document_id -> documents.id
  if exists (
    select 1 from jsonb_to_recordset(backup_data->'sections') as s(document_id uuid)
    left join jsonb_to_recordset(backup_data->'documents') as d(id uuid) on s.document_id = d.id
    where d.id is null
  ) then
    raise exception 'sectionsのdocument_idに対応するdocumentが存在しません';
  end if;

  -- connections.document_id -> documents.id
  if exists (
    select 1 from jsonb_to_recordset(backup_data->'connections') as c(document_id uuid)
    left join jsonb_to_recordset(backup_data->'documents') as d(id uuid) on c.document_id = d.id
    where d.id is null
  ) then
    raise exception 'connectionsのdocument_idに対応するdocumentが存在しません';
  end if;

  -- items.section_id -> sections.id
  if exists (
    select 1 from jsonb_to_recordset(backup_data->'items') as i(section_id uuid)
    left join jsonb_to_recordset(backup_data->'sections') as s(id uuid) on i.section_id = s.id
    where s.id is null
  ) then
    raise exception 'itemsのsection_idに対応するsectionが存在しません';
  end if;

  -- review_logs.item_id -> items.id
  if exists (
    select 1 from jsonb_to_recordset(backup_data->'reviewLogs') as r(item_id uuid)
    left join jsonb_to_recordset(backup_data->'items') as i(id uuid) on r.item_id = i.id
    where i.id is null
  ) then
    raise exception 'reviewLogsのitem_idに対応するitemが存在しません';
  end if;

  -- 4. 既存データの削除 (外部キー制約の逆順)
  delete from public.review_logs;
  delete from public.connections;
  delete from public.items;
  delete from public.sections;
  delete from public.documents;

  -- 5. データの復元 (INSERT)
  -- Documents
  insert into public.documents (id, purpose, type, title, authors, categories, summary, notebook_lm_report, key_points, created_at, updated_at)
  select 
    id, purpose, type, title, 
    coalesce(authors, '[]'::jsonb), 
    coalesce(categories, '[]'::jsonb), 
    summary, notebook_lm_report, 
    coalesce(key_points, '[]'::jsonb), 
    created_at, updated_at
  from jsonb_to_recordset(backup_data->'documents') as x(
    id uuid, purpose text, type text, title text, authors jsonb, categories jsonb, summary text, notebook_lm_report text, key_points jsonb, created_at timestamp with time zone, updated_at timestamp with time zone
  );
  get diagnostics doc_count = row_count;

  -- Sections
  insert into public.sections (id, document_id, title, summary, original_text, archive_report, keywords, sort_order, created_at, updated_at)
  select 
    id, document_id, title, summary, 
    coalesce(original_text, ''), 
    coalesce(archive_report, ''), 
    coalesce(keywords, '[]'::jsonb), 
    sort_order, created_at, updated_at
  from jsonb_to_recordset(backup_data->'sections') as x(
    id uuid, document_id uuid, title text, summary text, original_text text, archive_report text, keywords jsonb, sort_order int, created_at timestamp with time zone, updated_at timestamp with time zone
  );
  get diagnostics sec_count = row_count;

  -- Items
  insert into public.items (id, section_id, title, summary, detail, review_prompt, review_enabled, keywords, sort_order, verification_status, created_at, updated_at)
  select 
    id, section_id, title, summary, detail, review_prompt, review_enabled, 
    coalesce(keywords, '[]'::jsonb), sort_order, verification_status, created_at, updated_at
  from jsonb_to_recordset(backup_data->'items') as x(
    id uuid, section_id uuid, title text, summary text, detail text, review_prompt text, review_enabled boolean, keywords jsonb, sort_order int, verification_status text, created_at timestamp with time zone, updated_at timestamp with time zone
  );
  get diagnostics item_count = row_count;

  -- Connections
  insert into public.connections (id, document_id, type, title, connection, question, starting_points, search_keywords, basis, sort_order, created_at, updated_at)
  select 
    id, document_id, type, title, 
    coalesce(connection, ''), coalesce(question, ''), 
    coalesce(starting_points, '[]'::jsonb), coalesce(search_keywords, '[]'::jsonb), 
    basis, sort_order, created_at, updated_at
  from jsonb_to_recordset(backup_data->'connections') as x(
    id uuid, document_id uuid, type text, title text, connection text, question text, starting_points jsonb, search_keywords jsonb, basis text, sort_order int, created_at timestamp with time zone, updated_at timestamp with time zone
  );
  get diagnostics conn_count = row_count;

  -- Review Logs
  insert into public.review_logs (id, item_id, result, reviewed_at)
  select id, item_id, result, reviewed_at
  from jsonb_to_recordset(backup_data->'reviewLogs') as x(
    id uuid, item_id uuid, result text, reviewed_at timestamp with time zone
  );
  get diagnostics log_count = row_count;

  -- 6. 復元件数を返す
  return jsonb_build_object(
    'documents', doc_count,
    'sections', sec_count,
    'items', item_count,
    'connections', conn_count,
    'reviewLogs', log_count
  );
end;
$$;
