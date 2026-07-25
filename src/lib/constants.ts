export const DOCUMENT_PURPOSE_LABELS: Record<string, string> = {
  study: '学習資料',
  archive: '文章アーカイブ',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  book: '書籍',
  paper: '論文',
  article: '記事',
  report: 'レポート',
  lecture: '講義',
  novel: '小説',
  essay: 'エッセイ',
  anime_impressions: 'アニメ感想',
  personal_writing: '自作文章',
  other: 'その他',
};

export const CONNECTION_TYPE_LABELS: Record<string, string> = {
  field: '学問分野',
  concept: '概念・理論',
  person: '人物',
  book: '書籍',
  paper: '論文',
  research_topic: '研究テーマ',
  work: '関連作品',
  other: 'その他',
};

export const CONNECTION_BASIS_LABELS: Record<string, string> = {
  direct: '資料内で直接言及',
  inferred: '資料内容からの接続',
  external: '外部知識による提案',
};

// ユーティリティ関数
export const getLabel = (record: Record<string, string>, key: string | undefined | null, fallback = '不明') => {
  if (!key) return fallback;
  return record[key] || fallback;
};
