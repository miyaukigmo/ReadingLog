import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, BookOpen, FileText, Database, Link as LinkIcon, FileCheck, LayoutGrid, List, ChevronDown, ChevronRight } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, getLabel, getTypeBadgeClass, getTypeCardClass } from '@/lib/constants';
import { HighlightText } from '@/components/HighlightText';

// キーワードの前後を切り出してスニペットを作る関数
function getSnippet(text: string, query: string, maxLength: number = 80): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');

  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 60);
  let snippet = text.substring(start, end);
  
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  // 状態管理（URLクエリ優先）
  const selectedPurpose = searchParams.get('purpose') || 'all';
  const selectedType = searchParams.get('type') || 'all';
  const selectedCategory = searchParams.get('category') || 'all';
  const groupBy = searchParams.get('groupBy') || 'none';

  // 表示形式（ローカルストレージ）
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    return (localStorage.getItem('readingLogViewMode') as 'card' | 'list') || 'card';
  });

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('readingLogViewMode', mode);
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const updateSearchParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all' || value === 'none' || !value) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams);
  };

  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        sections (
          *,
          items (*)
        ),
        connections (*),
        person_entries (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    documents.forEach(doc => {
      if (Array.isArray(doc.categories)) {
        doc.categories.forEach((c: string) => cats.add(c));
      }
    });
    return Array.from(cats);
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 検索用の一時データをクリア
      doc._searchMatch = null;

      // purpose絞り込み
      if (selectedPurpose !== 'all' && doc.purpose !== selectedPurpose) return false;
      // タイプ絞り込み
      if (selectedType !== 'all' && doc.type !== selectedType) return false;
      // カテゴリー絞り込み
      if (selectedCategory !== 'all' && (!doc.categories || !doc.categories.includes(selectedCategory))) return false;
      // 検索文字列
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      
      const checkMatch = (text: string | null | undefined, fieldName: string): boolean => {
        if (!text) return false;
        if (text.toLowerCase().includes(q)) {
          doc._searchMatch = { field: fieldName, snippet: getSnippet(text, q) };
          return true;
        }
        return false;
      };

      if (checkMatch(doc.title, 'タイトル')) return true;
      if (checkMatch(doc.summary, '資料のまとめ')) return true;
      if (checkMatch(doc.notebook_lm_report, 'NotebookLMレポート')) return true;
      if (checkMatch(doc.purpose, '用途')) return true;
      
      if (doc.authors?.some((a: string) => checkMatch(a, '著者'))) return true;
      if (doc.categories?.some((c: string) => checkMatch(c, 'カテゴリー'))) return true;
      if (doc.key_points?.some((k: string) => checkMatch(k, '重要ポイント'))) return true;

      for (const sec of (doc.sections || [])) {
        if (checkMatch(sec.title, 'セクション名')) return true;
        if (checkMatch(sec.summary, 'セクション概要')) return true;
        if (checkMatch(sec.original_text, '原文')) return true;
        if (checkMatch(sec.archive_report, '詳しい整理')) return true;
        if (sec.keywords?.some((k: string) => checkMatch(k, 'キーワード'))) return true;
        for (const item of (sec.items || [])) {
          if (checkMatch(item.title, '項目タイトル')) return true;
          if (checkMatch(item.summary, '項目概要')) return true;
          if (checkMatch(item.detail, '項目詳細')) return true;
          if (checkMatch(item.review_prompt, '復習の問い')) return true;
          if (item.keywords?.some((k: string) => checkMatch(k, 'キーワード'))) return true;
        }
      }

      for (const conn of (doc.connections || [])) {
        if (checkMatch(conn.title, 'つながりタイトル')) return true;
        if (checkMatch(conn.connection, 'つながりの理由')) return true;
        if (checkMatch(conn.question, 'つながりの問い')) return true;
        if (conn.search_keywords?.some((k: string) => checkMatch(k, '検索キーワード'))) return true;
        if (conn.starting_points?.some((k: string) => checkMatch(k, '入口の概念'))) return true;
      }

      for (const person of (doc.person_entries || [])) {
        if (checkMatch(person.name, '人物名')) return true;
        if (person.source_name_expressions?.some((n: string) => checkMatch(n, '資料内の名前表記'))) return true;
        if (checkMatch(person.original_name, '原語名')) return true;
        if (checkMatch(person.display_summary, '人物概要')) return true;
        if (checkMatch(person.source_summary, '本書での扱い')) return true;
        if (checkMatch(person.role_in_document, '本書での役割')) return true;
        if (person.key_ideas_or_actions?.some((i: string) => checkMatch(i, '本書内で重要な思想・行動'))) return true;
        if (person.source_works?.some((w: string) => checkMatch(w, '本書で言及された作品'))) return true;
        if (checkMatch(person.external_profile, '外部プロフィール')) return true;
        if (checkMatch(person.life_span_label, '生没年ラベル')) return true;
        if (person.activity_regions?.some((r: string) => checkMatch(r, '活動地域'))) return true;
        if (person.external_key_works?.some((w: any) => checkMatch(w.title, '外部代表作'))) return true;
        if (person.source_locations?.some((l: string) => checkMatch(l, '登場箇所'))) return true;
        if (checkMatch(person.identity_note, '人物同定上の注意')) return true;
        if (person.external_sources?.some((s: any) => checkMatch(s.title, '外部出典タイトル') || checkMatch(s.publisher, '外部出典の出版元'))) return true;
      }

      return false;
    });
  }, [documents, searchQuery, selectedPurpose, selectedType, selectedCategory]);

  const groupedDocuments = useMemo(() => {
    if (groupBy === 'none') {
      return [{ groupName: null, docs: filteredDocuments }];
    }

    const groups: Record<string, any[]> = {};

    filteredDocuments.forEach(doc => {
      let keys: string[] = [];
      if (groupBy === 'type') {
        keys = [getLabel(DOCUMENT_TYPE_LABELS, doc.type, doc.type)];
      } else if (groupBy === 'author') {
        keys = doc.authors && doc.authors.length > 0 ? doc.authors : ['著者不明'];
      }

      keys.forEach(key => {
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
      });
    });

    // グループ内のソート（タイトル順）
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
    });

    // グループ自体のソート（件数が多い順、同数ならあいうえお順）
    return Object.keys(groups)
      .sort((a, b) => {
        const countDiff = groups[b].length - groups[a].length;
        if (countDiff !== 0) return countDiff;
        return a.localeCompare(b, 'ja');
      })
      .map(key => ({
        groupName: key,
        docs: groups[key]
      }));
  }, [filteredDocuments, groupBy]);


  const getTabFromSearchMatch = (field?: string) => {
    if (!field) return '';
    if (['セクション名', 'セクション概要', '原文', '詳しい整理', 'キーワード', '項目タイトル', '項目概要', '項目詳細', '復習の問い'].includes(field)) return '?tab=sections';
    if (['つながりタイトル', 'つながりの理由', 'つながりの問い', '検索キーワード', '入口の概念'].includes(field)) return '?tab=connections';
    if (['人物名', '資料内の名前表記', '原語名', '人物概要', '本書での扱い', '本書での役割', '本書内で重要な思想・行動', '本書で言及された作品', '外部プロフィール', '生没年ラベル', '活動地域', '外部代表作', '登場箇所', '人物同定上の注意', '外部出典タイトル', '外部出典の出版元'].includes(field)) return '?tab=people';
    return '?tab=overview';
  };

  const renderCard = (doc: any) => {
    const isArchive = doc.purpose === 'archive';
    
    let totalItems = 0;
    let reviewItems = 0;
    let verifiedItems = 0;
    let originalTextCount = 0;
    let archiveReportCount = 0;
    const sectionCount = doc.sections?.length || 0;
    const connectionCount = doc.connections?.length || 0;
    
    doc.sections?.forEach((sec: any) => {
      if (sec.original_text) originalTextCount++;
      if (sec.archive_report) archiveReportCount++;
      
      totalItems += (sec.items || []).length;
      sec.items?.forEach((item: any) => {
        if (item.review_enabled) reviewItems++;
        if (item.verification_status === 'verified') verifiedItems++;
      });
    });

    return (
      <div
        key={doc.id}
        onClick={() => navigate(`/document/${doc.id}${getTabFromSearchMatch(doc._searchMatch?.field)}`)}
        className={`group relative flex flex-col justify-between rounded-xl bg-white p-4 sm:p-6 shadow-sm border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${getTypeCardClass(doc.type)}`}
      >
        <div>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors">
              <HighlightText text={doc.title} query={searchQuery} />
            </h2>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${getTypeBadgeClass(doc.type)}`}>
                {getLabel(DOCUMENT_TYPE_LABELS, doc.type, doc.type)}
              </span>
              {isArchive && (
                <span className="inline-flex items-center rounded-md bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">
                  文章アーカイブ
                </span>
              )}
            </div>
          </div>
          {doc.authors && doc.authors.length > 0 && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-1">
              <HighlightText text={doc.authors.join(', ')} query={searchQuery} />
            </p>
          )}
          
          {doc._searchMatch && doc._searchMatch.field !== 'タイトル' && doc._searchMatch.field !== '著者' && (
            <div className="mt-3 bg-yellow-50/50 p-2 rounded border border-yellow-100 text-xs text-gray-700">
              <span className="font-bold text-yellow-800 mr-1">[{doc._searchMatch.field}]</span>
              <HighlightText text={doc._searchMatch.snippet} query={searchQuery} />
            </div>
          )}
          
          <div className="mt-4 flex flex-wrap gap-1">
            {doc.categories?.slice(0, 3).map((c: string, i: number) => (
              <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {c}
              </span>
            ))}
            {doc.categories?.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                +{doc.categories.length - 3}
              </span>
            )}
          </div>
        </div>

        {isArchive ? (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4 text-gray-600">
            <div className="flex items-center gap-1" title="セクション数">
              <Database className="h-4 w-4" />
              <span className="text-sm font-semibold">{sectionCount}</span>
            </div>
            <div className="flex items-center gap-1" title="原文ありセクション数">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-semibold">{originalTextCount}</span>
            </div>
            <div className="flex items-center gap-1" title="詳しい整理ありセクション数">
              <FileCheck className="h-4 w-4" />
              <span className="text-sm font-semibold">{archiveReportCount}</span>
            </div>
            <div className="flex items-center gap-1" title="Connections件数">
              <LinkIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">{connectionCount}</span>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-900">{totalItems}</div>
              <div className="text-[10px] text-gray-500 uppercase">項目</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-900">
                {totalItems > 0 ? `${reviewItems}/${totalItems}` : '0'}
              </div>
              <div className="text-[10px] text-gray-500 uppercase">復習対象</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-900">
                {totalItems > 0 ? `${verifiedItems}/${totalItems}` : '0'}
              </div>
              <div className="text-[10px] text-gray-500 uppercase">確認済み</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderList = (doc: any) => {
    const isArchive = doc.purpose === 'archive';
    
    return (
      <div
        key={doc.id}
        onClick={() => navigate(`/document/${doc.id}${getTabFromSearchMatch(doc._searchMatch?.field)}`)}
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 bg-white border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset capitalize ${getTypeBadgeClass(doc.type)}`}>
                {getLabel(DOCUMENT_TYPE_LABELS, doc.type, doc.type)}
              </span>
              {isArchive && (
                <span className="inline-flex items-center rounded-md bg-purple-100 text-purple-700 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                  アーカイブ
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-gray-900 truncate">
              <HighlightText text={doc.title} query={searchQuery} />
            </h2>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1 shrink-0 ml-10 sm:ml-0">
          <div className="text-xs text-gray-500 truncate max-w-[200px]">
            {doc.authors?.join(', ')}
          </div>
          {doc._searchMatch && doc._searchMatch.field !== 'タイトル' && (
            <div className="text-[10px] text-gray-500 truncate max-w-[250px]">
              <span className="font-bold text-yellow-600 mr-1">[{doc._searchMatch.field}]</span>
              <HighlightText text={doc._searchMatch.snippet} query={searchQuery} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-900">
            <BookOpen className="h-6 w-6 text-gray-900" />
            <h1 className="text-xl font-bold tracking-tight">Library</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/import"
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-5 w-5" />
              資料を追加
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-3">
          {/* 検索・絞り込み */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="タイトル、著者、内容で検索..."
                className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 text-sm sm:leading-6 bg-gray-50/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 shrink-0 scrollbar-hide">
              <select
                className="block w-[130px] sm:w-36 shrink-0 rounded-md border-0 py-2 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-gray-900 text-xs sm:text-sm sm:leading-6 bg-white"
                value={selectedPurpose}
                onChange={(e) => updateSearchParam('purpose', e.target.value)}
              >
                <option value="all">すべての用途</option>
                <option value="study">学習資料</option>
                <option value="archive">文章アーカイブ</option>
              </select>
              
              <select
                className="block w-[130px] sm:w-36 shrink-0 rounded-md border-0 py-2 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-gray-900 text-xs sm:text-sm sm:leading-6 bg-white"
                value={selectedType}
                onChange={(e) => updateSearchParam('type', e.target.value)}
              >
                <option value="all">すべての種類</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                className="block w-[150px] sm:w-48 shrink-0 rounded-md border-0 py-2 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-gray-900 text-xs sm:text-sm sm:leading-6 bg-white"
                value={selectedCategory}
                onChange={(e) => updateSearchParam('category', e.target.value)}
              >
                <option value="all">すべてのカテゴリー</option>
                {allCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 表示形式・グループ化 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 px-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-700 font-medium">
              <span className="mr-1 hidden sm:inline">グループ化:</span>
              <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                <button
                  onClick={() => updateSearchParam('groupBy', 'none')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${groupBy === 'none' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  作成順
                </button>
                <button
                  onClick={() => updateSearchParam('groupBy', 'type')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${groupBy === 'type' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  種類
                </button>
                <button
                  onClick={() => updateSearchParam('groupBy', 'author')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${groupBy === 'author' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  作者
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto shrink-0">
              <button
                onClick={() => handleViewModeChange('card')}
                className={`flex-1 sm:flex-none flex items-center justify-center p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="カード表示"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex-1 sm:flex-none flex items-center justify-center p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                title="リスト表示"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            該当する資料がありません。
          </div>
        ) : (
          <div className="space-y-6">
            {groupedDocuments.map((group, groupIdx) => {
              const isGrouped = group.groupName !== null;
              const isExpanded = isGrouped ? expandedGroups[group.groupName] : true;

              return (
                <div key={groupIdx} className={isGrouped ? "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" : ""}>
                  {isGrouped && (
                    <button
                      onClick={() => toggleGroup(group.groupName as string)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left border-b border-gray-100"
                    >
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        {group.groupName}
                        <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                          {group.docs.length}
                        </span>
                      </h3>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  )}
                  
                  {(!isGrouped || isExpanded) && (
                    <div className={isGrouped ? "p-4 sm:p-6 bg-gray-50/50" : ""}>
                      {viewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {group.docs.map(doc => renderCard(doc))}
                        </div>
                      ) : (
                        <div className={isGrouped ? "bg-white rounded-lg border border-gray-200 overflow-hidden" : "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"}>
                          {group.docs.map((doc) => (
                            <div key={doc.id}>
                              {renderList(doc)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
