import { z } from 'zod';
import { timelineEntrySchema } from './timeline';


// ==========================================
// 共通 / V1.0用の基本スキーマ
// ==========================================
export const itemSchema = z.object({
  title: z.string().min(1, '項目タイトルは必須です'),
  summary: z.string().optional().default(''),
  detail: z.string().optional().default(''),
  reviewPrompt: z.string().optional().default(''),
  reviewEnabled: z.boolean().optional().default(false),
  keywords: z.array(z.string()).optional().default([]),
});

export const sectionSchema = z.object({
  title: z.string().min(1, 'セクションタイトルは必須です'),
  summary: z.string().optional().default(''),
  items: z.array(itemSchema).optional().default([]),
});

export const documentSchema = z.object({
  type: z.enum(['book', 'paper', 'article', 'report', 'lecture', 'other']),
  title: z.string().min(1, '資料タイトルは必須です'),
  authors: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  summary: z.string().optional().default(''),
  notebookLmReport: z.string().optional().default(''),
  keyPoints: z.array(z.string()).optional().default([]),
  sections: z.array(sectionSchema).optional().default([]),
});

export const importSchemaV1 = z.object({
  schemaVersion: z.literal('1.0'),
  document: documentSchema,
});

// ==========================================
// V1.1用のスキーマ (文章アーカイブ対応)
// ==========================================
export const connectionSchema = z.object({
  type: z.enum(['field', 'concept', 'person', 'book', 'paper', 'research_topic', 'work', 'other']),
  title: z.string().min(1, 'コネクションタイトルは必須です'),
  connection: z.string().optional().default(''),
  question: z.string().optional().default(''),
  startingPoints: z.array(z.string()).optional().default([]),
  searchKeywords: z.array(z.string()).optional().default([]),
  basis: z.enum(['direct', 'inferred', 'external']),
}).strict();

export const sectionSchemaV11 = z.object({
  title: z.string().min(1, 'セクションタイトルは必須です'),
  summary: z.string().optional().default(''),
  archiveReport: z.string().optional().default(''),
  originalText: z.string().optional().default(''),
  keywords: z.array(z.string()).optional().default([]),
  items: z.array(itemSchema).optional().default([]),
}).strict();

export const documentSchemaV11 = z.object({
  purpose: z.enum(['study', 'archive']).default('study'),
  type: z.enum(['book', 'paper', 'article', 'report', 'lecture', 'novel', 'essay', 'anime_impressions', 'personal_writing', 'other']),
  title: z.string().min(1, '資料タイトルは必須です'),
  authors: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  summary: z.string().optional().default(''),
  notebookLmReport: z.string().optional().default(''),
  personalNote: z.string().optional().default(''),
  keyPoints: z.array(z.string()).optional().default([]),
  sections: z.array(sectionSchemaV11).optional().default([]),
  connections: z.array(connectionSchema).optional().default([]),
  is_read: z.boolean().optional().default(false),
}).strict();

export const importSchemaV11 = z.object({
  schemaVersion: z.literal('1.1'),
  document: documentSchemaV11,
}).strict();

// ==========================================
// V1.2用のスキーマ (年代索引対応)
// ==========================================
export const documentSchemaV12 = documentSchemaV11.extend({
  timelineEntries: z.array(timelineEntrySchema).optional().default([]),
});

export const importSchemaV12 = z.object({
  schemaVersion: z.literal('1.2'),
  document: documentSchemaV12,
}).strict();

// V1.3 backup schema
const v13PersonEntrySchema = z.object({
  id: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  name: z.string(),
  sourceNameExpressions: z.array(z.string()).nullable().optional(),
  originalName: z.string().nullable().optional(),
  entityKind: z.string(),
  personType: z.string(),
  fields: z.array(z.string()).nullable().optional(),
  importance: z.string(),
  mentionTypes: z.array(z.string()).nullable().optional(),
  mergeGroupId: z.string().uuid().optional().nullable(),
  displaySummary: z.string().nullable().optional(),
  sourceSummary: z.string().nullable().optional(),
  roleInDocument: z.string().nullable().optional(),
  keyIdeasOrActions: z.array(z.string()).nullable().optional(),
  sourceWorks: z.array(z.string()).nullable().optional(),
  externalProfile: z.string().nullable().optional(),
  lifeSpanLabel: z.string().nullable().optional(),
  birthYear: z.number().nullable().optional(),
  deathYear: z.number().nullable().optional(),
  lifeDateCertainty: z.string(),
  activityRegions: z.array(z.string()).nullable().optional(),
  externalKeyWorks: z.array(z.object({
    title: z.string(),
    year: z.number().nullable().optional()
  })).nullable().optional(),
  sourceLocations: z.array(z.string()).nullable().optional(),
  selectionReason: z.string().nullable().optional(),
  identityNote: z.string().nullable().optional(),
  externalSources: z.array(z.object({
    title: z.string(),
    publisher: z.string().nullable().optional(),
    url: z.string().nullable().optional()
  })).nullable().optional(),
  processingStatus: z.string().nullable().optional(),
  sourceVerificationStatus: z.string().nullable().optional(),
  externalVerificationStatus: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// ==========================================
// V1.3用のスキーマ (人物索引対応)
// ==========================================
export const documentSchemaV13 = documentSchemaV12.extend({
  peopleEntries: z.array(v13PersonEntrySchema).optional().default([]),
});

export const importSchemaV13 = z.object({
  schemaVersion: z.literal('1.3'),
  document: documentSchemaV13,
}).strict();

export type ImportDataV1 = z.infer<typeof importSchemaV1>;
export type ImportDataV11 = z.infer<typeof importSchemaV11>;
export type ImportDataV12 = z.infer<typeof importSchemaV12>;
export type ImportDataV13 = z.infer<typeof importSchemaV13>;
export type ConnectionData = z.infer<typeof connectionSchema>;

// インポートデータ統合型
export const importSchema = z.union([importSchemaV1, importSchemaV11, importSchemaV12, importSchemaV13]);
export type ImportData = z.infer<typeof importSchema>;

// ==========================================
// バックアップ用スキーマ
// ==========================================

export const backupSchemaV1 = z.object({
  format: z.literal('readinglog-backup'),
  backupVersion: z.literal('1.0'),
  exportedAt: z.string(),
  data: z.object({
    documents: z.array(z.object({
      id: z.string().uuid(),
      type: z.string(),
      title: z.string(),
      authors: z.array(z.string()).nullable().optional(),
      categories: z.array(z.string()).nullable().optional(),
      summary: z.string().nullable().optional(),
      notebook_lm_report: z.string().nullable().optional(),
      personal_note: z.string().nullable().optional(),
      key_points: z.array(z.string()).nullable().optional(),
      created_at: z.string(),
      updated_at: z.string()
    })),
    sections: z.array(z.object({
      id: z.string().uuid(),
      document_id: z.string().uuid(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      sort_order: z.number(),
      created_at: z.string(),
      updated_at: z.string()
    })),
    items: z.array(z.object({
      id: z.string().uuid(),
      section_id: z.string().uuid(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      detail: z.string().nullable().optional(),
      review_prompt: z.string().nullable().optional(),
      review_enabled: z.boolean(),
      keywords: z.array(z.string()).nullable().optional(),
      sort_order: z.number(),
      verification_status: z.enum(['unverified', 'verified']),
      created_at: z.string(),
      updated_at: z.string()
    })),
    reviewLogs: z.array(z.object({
      id: z.string().uuid(),
      item_id: z.string().uuid(),
      result: z.enum(['understood', 'uncertain', 'forgot']),
      reviewed_at: z.string()
    }))
  })
});

export const backupSchemaV11 = z.object({
  format: z.literal('readinglog-backup'),
  backupVersion: z.literal('1.1'),
  exportedAt: z.string(),
  data: z.object({
    documents: z.array(z.object({
      id: z.string().uuid(),
      purpose: z.string(),
      type: z.string(),
      title: z.string(),
      authors: z.array(z.string()).nullable().optional(),
      categories: z.array(z.string()).nullable().optional(),
      summary: z.string().nullable().optional(),
      notebook_lm_report: z.string().nullable().optional(),
      personal_note: z.string().nullable().optional(),
      key_points: z.array(z.string()).nullable().optional(),
      is_read: z.boolean().nullable().optional(),
      created_at: z.string(),
      updated_at: z.string()
    })),
    sections: z.array(z.object({
      id: z.string().uuid(),
      document_id: z.string().uuid(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      original_text: z.string().nullable().optional(),
      archive_report: z.string().nullable().optional(),
      keywords: z.array(z.string()).nullable().optional(),
      sort_order: z.number(),
      created_at: z.string(),
      updated_at: z.string()
    })),
    items: z.array(z.object({
      id: z.string().uuid(),
      section_id: z.string().uuid(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      detail: z.string().nullable().optional(),
      review_prompt: z.string().nullable().optional(),
      review_enabled: z.boolean(),
      keywords: z.array(z.string()).nullable().optional(),
      sort_order: z.number(),
      verification_status: z.enum(['unverified', 'verified']),
      created_at: z.string(),
      updated_at: z.string()
    })),
    connections: z.array(z.object({
      id: z.string().uuid(),
      document_id: z.string().uuid(),
      type: z.string(),
      title: z.string(),
      connection: z.string().nullable().optional(),
      question: z.string().nullable().optional(),
      starting_points: z.array(z.string()).nullable().optional(),
      search_keywords: z.array(z.string()).nullable().optional(),
      basis: z.string(),
      sort_order: z.number(),
      created_at: z.string(),
      updated_at: z.string()
    })),
    reviewLogs: z.array(z.object({
      id: z.string().uuid(),
      item_id: z.string().uuid(),
      result: z.enum(['understood', 'uncertain', 'forgot']),
      reviewed_at: z.string()
    }))
  })
});

// V1.2 backup schema
const v12TimelineEntrySchema = z.object({
  id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
  date_label: z.string(),
  source_date_expressions: z.array(z.string()).nullable().optional(),
  start_year: z.number().nullable().optional(),
  start_month: z.number().nullable().optional(),
  start_day: z.number().nullable().optional(),
  end_year: z.number().nullable().optional(),
  end_month: z.number().nullable().optional(),
  end_day: z.number().nullable().optional(),
  sort_year: z.number().nullable().optional(),
  precision: z.string(),
  date_source: z.string(),
  date_certainty: z.string(),
  period_labels: z.array(z.string()).nullable().optional(),
  title: z.string(),
  event_type: z.string(),
  importance: z.string(),
  display_summary: z.string().nullable().optional(),
  source_summary: z.string().nullable().optional(),
  external_context: z.string().nullable().optional(),
  selection_reason: z.string().nullable().optional(),
  source_locations: z.array(z.string()).nullable().optional(),
  regions: z.array(z.string()).nullable().optional(),
  fields: z.array(z.string()).nullable().optional(),
  external_sources: z.array(z.object({
    title: z.string(),
    publisher: z.string().nullable().optional(),
    url: z.string().nullable().optional()
  })).nullable().optional(),
  date_note: z.string().nullable().optional(),
  processing_status: z.string().nullable().optional(),
  source_verification_status: z.string().nullable().optional(),
  external_verification_status: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export const backupSchemaV12 = z.object({
  format: z.literal('readinglog-backup'),
  backupVersion: z.literal('1.2'),
  exportedAt: z.string(),
  data: backupSchemaV11.shape.data.extend({
    timelineEntries: z.array(v12TimelineEntrySchema).optional().default([]),
  }),
});

export const backupSchemaV13 = z.object({
  format: z.literal('readinglog-backup'),
  backupVersion: z.literal('1.3'),
  exportedAt: z.string(),
  data: backupSchemaV12.shape.data.extend({
    peopleEntries: z.array(v13PersonEntrySchema).optional().default([]),
  }),
});

export const backupSchema = z.union([backupSchemaV1, backupSchemaV11, backupSchemaV12, backupSchemaV13]);
export type BackupDataV1 = z.infer<typeof backupSchemaV1>;
export type BackupDataV11 = z.infer<typeof backupSchemaV11>;
export type BackupDataV12 = z.infer<typeof backupSchemaV12>;
export type BackupDataV13 = z.infer<typeof backupSchemaV13>;
export type BackupData = z.infer<typeof backupSchema>;
