-- supabase_migration_5.sql
-- documents テーブルにシリーズ関連のカラムを追加
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS series_title text,
ADD COLUMN IF NOT EXISTS series_number numeric;
