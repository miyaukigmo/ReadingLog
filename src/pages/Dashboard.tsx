import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, BookOpen, FileText, Database, Link as LinkIcon, FileCheck } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, getLabel } from '@/lib/constants';

export default function Dashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  // 状態管理（URLクエリ優先）
  const selectedPurpose = searchParams.get('purpose') || 'all';
  const selectedType = searchParams.get('type') || 'all';
  const selectedCategory = searchParams.get('category') || 'all';

  const updateSearchParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all' || !value) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams);
  };

  const navigate = useNavigate();

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'book': return { card: 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100/50', badge: 'bg-orange-50 text-orange-700 ring-orange-500/20' };
      case 'paper': return { card: 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100/50', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-500/20' };
      case 'article': return { card: 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100/50', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20' };
      case 'report': return { card: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100/50', badge: 'bg-blue-50 text-blue-700 ring-blue-500/20' };
      case 'lecture': return { card: 'border-rose-200 hover:border-rose-400 hover:shadow-rose-100/50', badge: 'bg-rose-50 text-rose-700 ring-rose-500/20' };
      case 'novel': return { card: 'border-purple-200 hover:border-purple-400 hover:shadow-purple-100/50', badge: 'bg-purple-50 text-purple-700 ring-purple-500/20' };
      case 'essay': return { card: 'border-teal-200 hover:border-teal-400 hover:shadow-teal-100/50', badge: 'bg-teal-50 text-teal-700 ring-teal-500/20' };
      default: return { card: 'border-slate-200 hover:border-slate-400 hover:shadow-slate-100/50', badge: 'bg-slate-50 text-slate-700 ring-slate-500/20' };
    }
  };

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
        connections (*)
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
      // purpose絞り込み
      if (selectedPurpose !== 'all' && doc.purpose !== selectedPurpose) return false;
      // タイプ絞り込み
      if (selectedType !== 'all' && doc.type !== selectedType) return false;
      // カテゴリー絞り込み
      if (selectedCategory !== 'all' && (!doc.categories || !doc.categories.includes(selectedCategory))) return false;
      // 検索文字列
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      
      if (doc.title?.toLowerCase().includes(q)) return true;
      if (doc.summary?.toLowerCase().includes(q)) return true;
      if (doc.notebook_lm_report?.toLowerCase().includes(q)) return true;
      if (doc.purpose?.toLowerCase().includes(q)) return true;
      if (doc.authors?.some((a: string) => a.toLowerCase().includes(q))) return true;
      if (doc.categories?.some((c: string) => c.toLowerCase().includes(q))) return true;
      if (doc.key_points?.some((k: string) => k.toLowerCase().includes(q))) return true;

      for (const sec of (doc.sections || [])) {
        if (sec.title?.toLowerCase().includes(q)) return true;
        if (sec.summary?.toLowerCase().includes(q)) return true;
        if (sec.original_text?.toLowerCase().includes(q)) return true;
        if (sec.archive_report?.toLowerCase().includes(q)) return true;
        if (sec.keywords?.some((k: string) => k.toLowerCase().includes(q))) return true;
        for (const item of (sec.items || [])) {
          if (item.title?.toLowerCase().includes(q)) return true;
          if (item.summary?.toLowerCase().includes(q)) return true;
          if (item.detail?.toLowerCase().includes(q)) return true;
          if (item.review_prompt?.toLowerCase().includes(q)) return true;
          if (item.keywords?.some((k: string) => k.toLowerCase().includes(q))) return true;
        }
      }

      for (const conn of (doc.connections || [])) {
        if (conn.title?.toLowerCase().includes(q)) return true;
        if (conn.connection?.toLowerCase().includes(q)) return true;
        if (conn.question?.toLowerCase().includes(q)) return true;
        if (conn.search_keywords?.some((k: string) => k.toLowerCase().includes(q))) return true;
        if (conn.starting_points?.some((k: string) => k.toLowerCase().includes(q))) return true;
      }

      return false;
    });
  }, [documents, searchQuery, selectedPurpose, selectedType, selectedCategory]);

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
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
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
            
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 shrink-0 scrollbar-hide">
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
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            該当する資料がありません。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map(doc => {
              const isArchive = doc.purpose === 'archive';
              
              // 集計処理
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
                  onClick={() => navigate(`/document/${doc.id}`)}
                  className={`group relative flex flex-col justify-between rounded-xl bg-white p-4 sm:p-6 shadow-sm border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${getTypeStyles(doc.type).card}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors">
                        {doc.title}
                      </h2>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${getTypeStyles(doc.type).badge}`}>
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
                        {doc.authors.join(', ')}
                      </p>
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
                        <div className="text-sm font-semibold text-gray-900">{reviewItems}</div>
                        <div className="text-[10px] text-gray-500 uppercase">復習対象</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-900">{verifiedItems}</div>
                        <div className="text-[10px] text-gray-500 uppercase">確認済み</div>
                      </div>
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
