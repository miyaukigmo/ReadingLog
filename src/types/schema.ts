import { z } from 'zod';

// ==========================================
// 共通 / V1.0用の基本スキーマ
// ==========================================
export const itemSchema = z.object({
  title: z.string().min(1, '項目タイトルは必須です'),
  summary: z.string().optional().default(''),
  detail: z.string().optional().default(''),
  reviewPrompt: z.string().optional().default(''),
  reviewEnabled: z.boolean().optional().default(true),
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
  keyPoints: z.array(z.string()).optional().default([]),
  sections: z.array(sectionSchemaV11).optional().default([]),
  connections: z.array(connectionSchema).optional().default([]),
}).strict();

export const importSchemaV11 = z.object({
  schemaVersion: z.literal('1.1'),
  document: documentSchemaV11,
}).strict();

export type ImportDataV1 = z.infer<typeof importSchemaV1>;
export type ImportDataV11 = z.infer<typeof importSchemaV11>;
export type ConnectionData = z.infer<typeof connectionSchema>;

// インポートデータ統合型
export const importSchema = z.union([importSchemaV1, importSchemaV11]);
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
      key_points: z.array(z.string()).nullable().optional(),
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

export const backupSchema = z.union([backupSchemaV1, backupSchemaV11]);
export type BackupDataV1 = z.infer<typeof backupSchemaV1>;
export type BackupDataV11 = z.infer<typeof backupSchemaV11>;
export type BackupData = z.infer<typeof backupSchema>;
