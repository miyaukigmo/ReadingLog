import { z } from 'zod';
import { FIELDS } from '@/lib/constants';

export const personEntrySchema = z.object({
  id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
  name: z.string().min(1, '名前は必須です'),
  source_name_expressions: z.array(z.string()).default([]),
  original_name: z.string().default(''),
  entity_kind: z.enum(['historical_person', 'religious_figure', 'mythological_figure']),
  person_type: z.enum([
    'philosopher_thinker',
    'writer_critic',
    'politician_activist',
    'religious_person',
    'artist',
    'scientist_researcher',
    'educator',
    'other'
  ]),
  fields: z.array(z.enum(FIELDS as any)).max(2, '分野は最大2件です').default([]),
  importance: z.enum(['major', 'supporting']),
  mention_types: z.array(z.enum([
    'subject', 'discussed', 'quoted', 'cited', 'compared', 'influence', 'critic', 'context'
  ])).max(2, '登場方法は最大2件です').default([]),
  merge_group_id: z.string().uuid().optional().nullable(),
  display_summary: z.string().default(''),
  source_summary: z.string().default(''),
  role_in_document: z.string().default(''),
  key_ideas_or_actions: z.array(z.string()).default([]),
  source_works: z.array(z.string()).default([]),
  external_profile: z.string().default(''),
  life_span_label: z.string().default(''),
  birth_year: z.number().nullable().refine(val => val !== 0, { message: '0は使用できません' }),
  death_year: z.number().nullable().refine(val => val !== 0, { message: '0は使用できません' }),
  life_date_certainty: z.enum([
    'established', 'approximate', 'disputed', 'context_dependent', 'unknown'
  ]),
  activity_regions: z.array(z.string()).max(2, '活動地域は最大2件です').default([]),
  external_key_works: z.array(z.object({
    title: z.string().min(1, '作品タイトルは必須です'),
    year: z.number().nullable().refine(val => val !== 0, { message: '0は使用できません' })
  })).max(3, '外部代表作は最大3件です').default([]),
  source_locations: z.array(z.string()).default([]),
  selection_reason: z.string().default(''),
  identity_note: z.string().default(''),
  external_sources: z.array(z.object({
    title: z.string().min(1, 'タイトルは必須です'),
    publisher: z.string().optional().default(''),
    url: z.string().url('有効なURLではありません').optional().or(z.literal(''))
  })).default([]),
  processing_status: z.literal('ai_processed').default('ai_processed'),
  source_verification_status: z.enum(['unverified', 'verified']).default('unverified'),
  external_verification_status: z.enum(['unverified', 'verified']).default('unverified'),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export type PersonEntry = z.infer<typeof personEntrySchema>;

// インポート用スキーマ (camelCase)
export const peopleImportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  dataType: z.literal('people'),
  sourceDocument: z.object({
    title: z.string().min(1, '資料タイトルは必須です'),
    authors: z.array(z.string()).default([])
  }),
  entries: z.array(z.object({
    name: z.string().min(1, '名前は必須です'),
    sourceNameExpressions: z.array(z.string()).default([]),
    originalName: z.string().default(''),
    entityKind: z.enum(['historical_person', 'religious_figure', 'mythological_figure']),
    personType: z.enum([
      'philosopher_thinker', 'writer_critic', 'politician_activist', 'religious_person',
      'artist', 'scientist_researcher', 'educator', 'other'
    ]),
    fields: z.array(z.enum(FIELDS as any)).max(2, '分野は最大2件です').default([]),
    importance: z.enum(['major', 'supporting']),
    mentionTypes: z.array(z.enum([
      'subject', 'discussed', 'quoted', 'cited', 'compared', 'influence', 'critic', 'context'
    ])).max(2, '登場方法は最大2件です').default([]),
    mergeGroupId: z.string().uuid().optional().nullable(),
    displaySummary: z.string().default(''),
    sourceSummary: z.string().default(''),
    roleInDocument: z.string().default(''),
    keyIdeasOrActions: z.array(z.string()).default([]),
    sourceWorks: z.array(z.string()).default([]),
    externalProfile: z.string().default(''),
    lifeSpanLabel: z.string().default(''),
    birthYear: z.number().nullable().refine(val => val !== 0, { message: '0は使用できません' }),
    deathYear: z.number().nullable().refine(val => val !== 0, { message: '0は使用できません' }),
    lifeDateCertainty: z.enum([
      'established', 'approximate', 'disputed', 'context_dependent', 'unknown'
    ]),
    activityRegions: z.array(z.string()).max(2, '活動地域は最大2件です').default([]),
    externalKeyWorks: z.array(z.object({
      title: z.string().min(1, '作品タイトルは必須です'),
      year: z.number().nullable().refine(val => val !== 0, { message: '0は使用できません' })
    })).max(3, '外部代表作は最大3件です').default([]),
    sourceLocations: z.array(z.string()).default([]),
    selectionReason: z.string().default(''),
    identityNote: z.string().default(''),
    externalSources: z.array(z.object({
      title: z.string().min(1, 'タイトルは必須です'),
      publisher: z.string().optional().default(''),
      url: z.string().url('有効なURLではありません').optional().or(z.literal(''))
    })).default([]),
    processingStatus: z.literal('ai_processed').default('ai_processed'),
    sourceVerificationStatus: z.enum(['unverified', 'verified']).default('unverified'),
    externalVerificationStatus: z.enum(['unverified', 'verified']).default('unverified')
  }))
});

export type PeopleImportData = z.infer<typeof peopleImportSchema>;
