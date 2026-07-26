-- Migration: Add merge_group_id to person_entries
-- This allows merging multiple person entries from different documents into a single logical person in the GlobalPeople view.

ALTER TABLE person_entries ADD COLUMN IF NOT EXISTS merge_group_id UUID;

-- index for faster grouping
CREATE INDEX IF NOT EXISTS idx_person_entries_merge_group_id ON person_entries(merge_group_id);
