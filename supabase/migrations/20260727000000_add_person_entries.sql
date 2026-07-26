-- 1. person_entries テーブルの作成
CREATE TABLE IF NOT EXISTS public.person_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    source_name_expressions JSONB DEFAULT '[]'::JSONB,
    original_name TEXT,
    entity_kind TEXT NOT NULL,
    person_type TEXT NOT NULL,
    fields JSONB DEFAULT '[]'::JSONB,
    importance TEXT NOT NULL,
    mention_types JSONB DEFAULT '[]'::JSONB,
    
    display_summary TEXT,
    source_summary TEXT,
    role_in_document TEXT,
    key_ideas_or_actions JSONB DEFAULT '[]'::JSONB,
    source_works JSONB DEFAULT '[]'::JSONB,
    
    external_profile TEXT,
    life_span_label TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    life_date_certainty TEXT NOT NULL,
    activity_regions JSONB DEFAULT '[]'::JSONB,
    external_key_works JSONB DEFAULT '[]'::JSONB,
    
    source_locations JSONB DEFAULT '[]'::JSONB,
    selection_reason TEXT,
    identity_note TEXT,
    external_sources JSONB DEFAULT '[]'::JSONB,
    
    processing_status TEXT DEFAULT 'ai_processed',
    source_verification_status TEXT DEFAULT 'unverified',
    external_verification_status TEXT DEFAULT 'unverified',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) の設定
ALTER TABLE public.person_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
    ON public.person_entries FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users"
    ON public.person_entries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users"
    ON public.person_entries FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
    ON public.person_entries FOR DELETE
    USING (true);

-- インデックス作成
CREATE INDEX IF NOT EXISTS person_entries_document_id_idx ON public.person_entries(document_id);

-- 2. replace_document_people RPC の作成
CREATE OR REPLACE FUNCTION public.replace_document_people(
    p_document_id UUID,
    p_entries JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. 指定されたドキュメントの既存の人物エントリをすべて削除
    DELETE FROM public.person_entries
    WHERE document_id = p_document_id;

    -- 2. 新しい人物エントリを挿入
    IF jsonb_array_length(p_entries) > 0 THEN
        INSERT INTO public.person_entries (
            document_id,
            name,
            source_name_expressions,
            original_name,
            entity_kind,
            person_type,
            fields,
            importance,
            mention_types,
            display_summary,
            source_summary,
            role_in_document,
            key_ideas_or_actions,
            source_works,
            external_profile,
            life_span_label,
            birth_year,
            death_year,
            life_date_certainty,
            activity_regions,
            external_key_works,
            source_locations,
            selection_reason,
            identity_note,
            external_sources,
            processing_status,
            source_verification_status,
            external_verification_status
        )
        SELECT
            p_document_id,
            (e->>'name')::TEXT,
            COALESCE(e->'sourceNameExpressions', '[]'::JSONB),
            (e->>'originalName')::TEXT,
            (e->>'entityKind')::TEXT,
            (e->>'personType')::TEXT,
            COALESCE(e->'fields', '[]'::JSONB),
            (e->>'importance')::TEXT,
            COALESCE(e->'mentionTypes', '[]'::JSONB),
            (e->>'displaySummary')::TEXT,
            (e->>'sourceSummary')::TEXT,
            (e->>'roleInDocument')::TEXT,
            COALESCE(e->'keyIdeasOrActions', '[]'::JSONB),
            COALESCE(e->'sourceWorks', '[]'::JSONB),
            (e->>'externalProfile')::TEXT,
            (e->>'lifeSpanLabel')::TEXT,
            (e->>'birthYear')::INTEGER,
            (e->>'deathYear')::INTEGER,
            (e->>'lifeDateCertainty')::TEXT,
            COALESCE(e->'activityRegions', '[]'::JSONB),
            COALESCE(e->'externalKeyWorks', '[]'::JSONB),
            COALESCE(e->'sourceLocations', '[]'::JSONB),
            (e->>'selectionReason')::TEXT,
            (e->>'identityNote')::TEXT,
            COALESCE(e->'externalSources', '[]'::JSONB),
            COALESCE((e->>'processingStatus')::TEXT, 'ai_processed'),
            COALESCE((e->>'sourceVerificationStatus')::TEXT, 'unverified'),
            COALESCE((e->>'externalVerificationStatus')::TEXT, 'unverified')
        FROM jsonb_array_elements(p_entries) AS e;
    END IF;
END;
$$;


-- 3. restore_full_backup RPC の更新 (person_entries 対応)
CREATE OR REPLACE FUNCTION public.restore_full_backup(backup_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    docs JSONB := backup_data->'documents';
    secs JSONB := backup_data->'sections';
    its  JSONB := backup_data->'items';
    cons JSONB := backup_data->'connections';
    logs JSONB := backup_data->'reviewLogs';
    times JSONB := backup_data->'timelineEntries';
    people JSONB := backup_data->'peopleEntries';
    result JSONB;
BEGIN
    -- 1. 既存データをすべて削除
    DELETE FROM public.review_logs;
    DELETE FROM public.items;
    DELETE FROM public.sections;
    DELETE FROM public.connections;
    DELETE FROM public.timeline_entries;
    DELETE FROM public.person_entries;
    DELETE FROM public.documents;

    -- 2. documents の挿入
    IF jsonb_array_length(docs) > 0 THEN
        INSERT INTO public.documents (
            id, created_at, updated_at, purpose, type, title, authors, categories, summary, notebook_lm_report, key_points
        )
        SELECT
            (d->>'id')::UUID,
            (d->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (d->>'updated_at')::TIMESTAMP WITH TIME ZONE,
            (d->>'purpose')::TEXT,
            (d->>'type')::TEXT,
            (d->>'title')::TEXT,
            COALESCE(d->'authors', '[]'::JSONB),
            COALESCE(d->'categories', '[]'::JSONB),
            (d->>'summary')::TEXT,
            (d->>'notebook_lm_report')::TEXT,
            COALESCE(d->'key_points', '[]'::JSONB)
        FROM jsonb_array_elements(docs) AS d;
    END IF;

    -- 3. sections の挿入
    IF jsonb_array_length(secs) > 0 THEN
        INSERT INTO public.sections (
            id, document_id, created_at, updated_at, title, summary, original_text, archive_report, keywords, sort_order
        )
        SELECT
            (s->>'id')::UUID,
            (s->>'document_id')::UUID,
            (s->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (s->>'updated_at')::TIMESTAMP WITH TIME ZONE,
            (s->>'title')::TEXT,
            (s->>'summary')::TEXT,
            (s->>'original_text')::TEXT,
            (s->>'archive_report')::TEXT,
            COALESCE(s->'keywords', '[]'::JSONB),
            (s->>'sort_order')::INTEGER
        FROM jsonb_array_elements(secs) AS s;
    END IF;

    -- 4. items の挿入
    IF jsonb_array_length(its) > 0 THEN
        INSERT INTO public.items (
            id, section_id, created_at, updated_at, title, summary, detail, review_prompt, review_enabled, next_review_at, review_interval_days, review_count, keywords, sort_order, verification_status
        )
        SELECT
            (i->>'id')::UUID,
            (i->>'section_id')::UUID,
            (i->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (i->>'updated_at')::TIMESTAMP WITH TIME ZONE,
            (i->>'title')::TEXT,
            (i->>'summary')::TEXT,
            (i->>'detail')::TEXT,
            (i->>'review_prompt')::TEXT,
            (i->>'review_enabled')::BOOLEAN,
            (i->>'next_review_at')::TIMESTAMP WITH TIME ZONE,
            (i->>'review_interval_days')::INTEGER,
            (i->>'review_count')::INTEGER,
            COALESCE(i->'keywords', '[]'::JSONB),
            (i->>'sort_order')::INTEGER,
            COALESCE((i->>'verification_status')::TEXT, 'unverified')
        FROM jsonb_array_elements(its) AS i;
    END IF;

    -- 5. connections の挿入
    IF jsonb_array_length(cons) > 0 THEN
        INSERT INTO public.connections (
            id, document_id, created_at, updated_at, type, title, connection, question, starting_points, search_keywords, basis, sort_order
        )
        SELECT
            (c->>'id')::UUID,
            (c->>'document_id')::UUID,
            (c->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (c->>'updated_at')::TIMESTAMP WITH TIME ZONE,
            (c->>'type')::TEXT,
            (c->>'title')::TEXT,
            (c->>'connection')::TEXT,
            (c->>'question')::TEXT,
            COALESCE(c->'starting_points', '[]'::JSONB),
            COALESCE(c->'search_keywords', '[]'::JSONB),
            (c->>'basis')::TEXT,
            (c->>'sort_order')::INTEGER
        FROM jsonb_array_elements(cons) AS c;
    END IF;

    -- 6. review_logs の挿入
    IF jsonb_array_length(logs) > 0 THEN
        INSERT INTO public.review_logs (
            id, item_id, created_at, score, actual_interval_days, next_interval_days
        )
        SELECT
            (l->>'id')::UUID,
            (l->>'item_id')::UUID,
            (l->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (l->>'score')::INTEGER,
            (l->>'actual_interval_days')::INTEGER,
            (l->>'next_interval_days')::INTEGER
        FROM jsonb_array_elements(logs) AS l;
    END IF;

    -- 7. timeline_entries の挿入
    IF jsonb_array_length(times) > 0 THEN
        INSERT INTO public.timeline_entries (
            id, document_id, created_at, updated_at, date_label, source_date_expressions, start_year, start_month, start_day, end_year, end_month, end_day, sort_year, precision, date_source, date_certainty, period_labels, title, event_type, importance, display_summary, source_summary, external_context, selection_reason, source_locations, regions, fields, external_sources, date_note, processing_status, source_verification_status, external_verification_status
        )
        SELECT
            (t->>'id')::UUID,
            (t->>'document_id')::UUID,
            (t->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (t->>'updated_at')::TIMESTAMP WITH TIME ZONE,
            (t->>'date_label')::TEXT,
            COALESCE(t->'source_date_expressions', '[]'::JSONB),
            (t->>'start_year')::INTEGER,
            (t->>'start_month')::INTEGER,
            (t->>'start_day')::INTEGER,
            (t->>'end_year')::INTEGER,
            (t->>'end_month')::INTEGER,
            (t->>'end_day')::INTEGER,
            (t->>'sort_year')::INTEGER,
            (t->>'precision')::TEXT,
            (t->>'date_source')::TEXT,
            (t->>'date_certainty')::TEXT,
            COALESCE(t->'period_labels', '[]'::JSONB),
            (t->>'title')::TEXT,
            (t->>'event_type')::TEXT,
            (t->>'importance')::TEXT,
            (t->>'display_summary')::TEXT,
            (t->>'source_summary')::TEXT,
            (t->>'external_context')::TEXT,
            (t->>'selection_reason')::TEXT,
            COALESCE(t->'source_locations', '[]'::JSONB),
            COALESCE(t->'regions', '[]'::JSONB),
            COALESCE(t->'fields', '[]'::JSONB),
            COALESCE(t->'external_sources', '[]'::JSONB),
            (t->>'date_note')::TEXT,
            COALESCE((t->>'processing_status')::TEXT, 'ai_processed'),
            COALESCE((t->>'source_verification_status')::TEXT, 'unverified'),
            COALESCE((t->>'external_verification_status')::TEXT, 'unverified')
        FROM jsonb_array_elements(times) AS t;
    END IF;

    -- 8. person_entries の挿入
    IF people IS NOT NULL AND jsonb_array_length(people) > 0 THEN
        INSERT INTO public.person_entries (
            id, document_id, created_at, updated_at, name, source_name_expressions, original_name, entity_kind, person_type, fields, importance, mention_types, display_summary, source_summary, role_in_document, key_ideas_or_actions, source_works, external_profile, life_span_label, birth_year, death_year, life_date_certainty, activity_regions, external_key_works, source_locations, selection_reason, identity_note, external_sources, processing_status, source_verification_status, external_verification_status
        )
        SELECT
            (p->>'id')::UUID,
            (p->>'document_id')::UUID,
            (p->>'created_at')::TIMESTAMP WITH TIME ZONE,
            (p->>'updated_at')::TIMESTAMP WITH TIME ZONE,
            (p->>'name')::TEXT,
            COALESCE(p->'source_name_expressions', '[]'::JSONB),
            (p->>'original_name')::TEXT,
            (p->>'entity_kind')::TEXT,
            (p->>'person_type')::TEXT,
            COALESCE(p->'fields', '[]'::JSONB),
            (p->>'importance')::TEXT,
            COALESCE(p->'mention_types', '[]'::JSONB),
            (p->>'display_summary')::TEXT,
            (p->>'source_summary')::TEXT,
            (p->>'role_in_document')::TEXT,
            COALESCE(p->'key_ideas_or_actions', '[]'::JSONB),
            COALESCE(p->'source_works', '[]'::JSONB),
            (p->>'external_profile')::TEXT,
            (p->>'life_span_label')::TEXT,
            (p->>'birth_year')::INTEGER,
            (p->>'death_year')::INTEGER,
            (p->>'life_date_certainty')::TEXT,
            COALESCE(p->'activity_regions', '[]'::JSONB),
            COALESCE(p->'external_key_works', '[]'::JSONB),
            COALESCE(p->'source_locations', '[]'::JSONB),
            (p->>'selection_reason')::TEXT,
            (p->>'identity_note')::TEXT,
            COALESCE(p->'external_sources', '[]'::JSONB),
            COALESCE((p->>'processing_status')::TEXT, 'ai_processed'),
            COALESCE((p->>'source_verification_status')::TEXT, 'unverified'),
            COALESCE((p->>'external_verification_status')::TEXT, 'unverified')
        FROM jsonb_array_elements(people) AS p;
    END IF;

    -- 結果の返却
    result := jsonb_build_object(
        'documents', (SELECT count(*) FROM public.documents),
        'sections', (SELECT count(*) FROM public.sections),
        'items', (SELECT count(*) FROM public.items),
        'connections', (SELECT count(*) FROM public.connections),
        'reviewLogs', (SELECT count(*) FROM public.review_logs),
        'timelineEntries', (SELECT count(*) FROM public.timeline_entries),
        'peopleEntries', (SELECT count(*) FROM public.person_entries)
    );

    RETURN result;
END;
$$;
