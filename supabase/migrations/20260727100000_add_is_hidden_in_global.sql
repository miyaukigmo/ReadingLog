-- Add is_hidden_in_global column to timeline_entries and person_entries
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS is_hidden_in_global BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE person_entries ADD COLUMN IF NOT EXISTS is_hidden_in_global BOOLEAN NOT NULL DEFAULT false;
