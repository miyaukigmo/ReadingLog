-- ドキュメントにパーソナルノート（Tiptapエディタ用）を追加
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS personal_note text;
