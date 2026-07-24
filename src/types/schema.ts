import { z } from 'zod';

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
  keyPoints: z.array(z.string()).optional().default([]),
  sections: z.array(sectionSchema).optional().default([]),
});

export const importSchema = z.object({
  schemaVersion: z.literal('1.0'),
  document: documentSchema,
});

export type ImportData = z.infer<typeof importSchema>;
export type DocumentData = z.infer<typeof documentSchema>;
export type SectionData = z.infer<typeof sectionSchema>;
export type ItemData = z.infer<typeof itemSchema>;
