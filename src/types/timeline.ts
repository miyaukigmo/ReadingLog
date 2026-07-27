import { z } from 'zod';
import { REGIONS, FIELDS, TIMELINE_EVENT_TYPE_LABELS } from '@/lib/constants';

// Zodスキーマ定義

export const timelineExternalSourceSchema = z.object({
  title: z.string().min(1, '出典タイトルは必須です'),
  publisher: z.string().optional().default(''),
  url: z.string().url('有効なURL形式で入力してください').optional().or(z.literal('')),
});

export const timelineEntrySchema = z.object({
  dateLabel: z.string().min(1, 'dateLabelは必須です'),
  sourceDateExpressions: z.array(z.string()).optional().default([]),
  startYear: z.number().nullable().refine(v => v !== 0, '年には0を使用できません'),
  startMonth: z.number().min(1).max(12).nullable(),
  startDay: z.number().min(1).max(31).nullable(),
  endYear: z.number().nullable().refine(v => v !== 0, '年には0を使用できません'),
  endMonth: z.number().min(1).max(12).nullable(),
  endDay: z.number().min(1).max(31).nullable(),
  sortYear: z.number().nullable().refine(v => v !== 0, '年には0を使用できません'),
  precision: z.enum(['exact_day', 'year', 'year_range', 'decade', 'century', 'half_century', 'approximate_period', 'named_period']),
  dateSource: z.enum(['source_exact', 'external_confirmed', 'normalized_from_source', 'mixed']),
  dateCertainty: z.enum(['established', 'approximate', 'disputed', 'context_dependent']),
  periodLabels: z.array(z.string()).optional().default([]),
  title: z.string().min(1, 'titleは必須です'),
  eventType: z.enum(Object.keys(TIMELINE_EVENT_TYPE_LABELS) as [string, ...string[]]),
  importance: z.enum(['major', 'supporting']),
  displaySummary: z.string().optional().default(''),
  sourceSummary: z.string().optional().default(''),
  externalContext: z.string().optional().default(''),
  selectionReason: z.string().optional().default(''),
  sourceLocations: z.array(z.string()).optional().default([]),
  regions: z.array(z.enum(REGIONS as unknown as [string, ...string[]]))
    .max(2, '地域タグは最大2件までです')
    .optional()
    .default([]),
  fields: z.array(z.enum(FIELDS as unknown as [string, ...string[]]))
    .max(2, '分野タグは最大2件までです')
    .optional()
    .default([]),
  externalSources: z.array(timelineExternalSourceSchema).optional().default([]),
  dateNote: z.string().optional().default(''),
  processingStatus: z.enum(['ai_processed']).default('ai_processed'),
  sourceVerificationStatus: z.enum(['unverified', 'verified']).default('unverified'),
  externalVerificationStatus: z.enum(['unverified', 'verified']).default('unverified'),
});

export const timelineImportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  dataType: z.literal('timeline'),
  sourceDocument: z.object({
    title: z.string(),
    authors: z.array(z.string()).optional().default([]),
  }),
  entries: z.array(timelineEntrySchema),
});

// TypeScript型定義
export type TimelineExternalSource = z.infer<typeof timelineExternalSourceSchema>;
export type TimelineEntry = z.infer<typeof timelineEntrySchema> & {
  id?: string;
  document_id?: string;
  created_at?: string;
  updated_at?: string;
  is_hidden_in_global?: boolean;
};
export type TimelineImportData = z.infer<typeof timelineImportSchema>;
