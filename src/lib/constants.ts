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

// ==========================================
// 年代 (Timeline) 関連定数
// ==========================================

export const REGIONS = [
  '日本',
  '東アジア',
  '東南アジア',
  '南アジア',
  '中東',
  'ヨーロッパ',
  '北米',
  '中南米',
  'アフリカ',
  'オセアニア',
  '世界',
  'その他',
] as const;

export const FIELDS = [
  '哲学・思想',
  '宗教',
  '文学',
  '美術',
  '音楽',
  '演劇・映像',
  '政治・法律',
  '社会・経済',
  '歴史',
  '心理',
  '教育',
  '科学・技術',
  'その他'
] as const;

export const TIMELINE_EVENT_TYPE_LABELS: Record<string, string> = {
  'person_birth': '誕生',
  'person_death': '死去',
  'publication': '出版・発表',
  'creation': '制作',
  'discovery': '発見・発明',
  'historical_event': '歴史的事件',
  'social_movement': '社会運動',
  'political_change': '政治的変化',
  'war_conflict': '戦争・紛争',
  'cultural_event': '文化的出来事',
  'natural_disaster': '自然災害',
  'biographical_event': '人生の出来事',
  'other': 'その他'
};

// ==========================================
// 人物索引関連
// ==========================================

export const ENTITY_KIND_LABELS: Record<string, string> = {
  'historical_person': '実在・歴史上の人物',
  'religious_figure': '宗教上の人物',
  'mythological_figure': '神話・伝説上の人物'
};

export const PERSON_TYPE_LABELS: Record<string, string> = {
  'philosopher_thinker': '哲学者・思想家',
  'writer_critic': '作家・批評家',
  'politician_activist': '政治家・社会活動家',
  'religious_person': '宗教者',
  'artist': '芸術家',
  'scientist_researcher': '科学者・研究者',
  'educator': '教育者',
  'other': 'その他'
};

export const MENTION_TYPE_LABELS: Record<string, string> = {
  'subject': '中心人物',
  'discussed': '説明',
  'quoted': '引用',
  'cited': '参照',
  'compared': '比較',
  'influence': '影響',
  'critic': '批判',
  'context': '背景'
};

export const LIFE_DATE_CERTAINTY_LABELS: Record<string, string> = {
  'established': '',
  'approximate': '概算',
  'disputed': '諸説あり',
  'context_dependent': '文脈依存',
  'unknown': '不明'
};


// バッジの色
export const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'book': return 'bg-orange-50 text-orange-700 ring-orange-500/20';
    case 'paper': return 'bg-indigo-50 text-indigo-700 ring-indigo-500/20';
    case 'article': return 'bg-emerald-50 text-emerald-700 ring-emerald-500/20';
    case 'report': return 'bg-blue-50 text-blue-700 ring-blue-500/20';
    case 'lecture': return 'bg-rose-50 text-rose-700 ring-rose-500/20';
    case 'novel': return 'bg-purple-50 text-purple-700 ring-purple-500/20';
    case 'essay': return 'bg-teal-50 text-teal-700 ring-teal-500/20';
    case 'anime_impressions': return 'bg-pink-50 text-pink-700 ring-pink-500/20';
    case 'personal_writing': return 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-500/20';
    default: return 'bg-slate-50 text-slate-700 ring-slate-500/20';
  }
};

// カードの枠線・影の色
export const getTypeCardClass = (type: string) => {
  switch (type) {
    case 'book': return 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100/50';
    case 'paper': return 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100/50';
    case 'article': return 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100/50';
    case 'report': return 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100/50';
    case 'lecture': return 'border-rose-200 hover:border-rose-400 hover:shadow-rose-100/50';
    case 'novel': return 'border-purple-200 hover:border-purple-400 hover:shadow-purple-100/50';
    case 'essay': return 'border-teal-200 hover:border-teal-400 hover:shadow-teal-100/50';
    case 'anime_impressions': return 'border-pink-200 hover:border-pink-400 hover:shadow-pink-100/50';
    case 'personal_writing': return 'border-fuchsia-200 hover:border-fuchsia-400 hover:shadow-fuchsia-100/50';
    default: return 'border-slate-200 hover:border-slate-400 hover:shadow-slate-100/50';
  }
};
