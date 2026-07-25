import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, BookOpen, Link as LinkIcon, FileText } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, getLabel, getTypeBadgeClass } from '@/lib/constants';

export default function TagDetail() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tag) fetchDocuments();
  }, [tag]);

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
      `);

    if (error) {
      console.error(error);
    } else {
      // タグを含む資料だけをフィルタリングして整形する
      const matchedDocs = (data || []).map(doc => {
        const matchedCategories = doc.categories?.includes(tag) ? doc.categories : [];
        const matchedSections = (doc.sections || []).filter((sec: any) => 
          sec.keywords?.includes(tag) || (sec.items || []).some((item: any) => item.keywords?.includes(tag))
        ).map((sec: any) => ({
          ...sec,
          matchedItems: (sec.items || []).filter((item: any) => item.keywords?.includes(tag))
        }));
        
        const matchedConnections = (doc.connections || []).filter((conn: any) => 
          conn.search_keywords?.includes(tag) || conn.starting_points?.includes(tag)
        );

        if (matchedCategories.length > 0 || matchedSections.length > 0 || matchedConnections.length > 0) {
          return {
            ...doc,
            matchedCategories,
            matchedSections,
            matchedConnections
          };
        }
        return null;
      }).filter(Boolean);

      setDocuments(matchedDocs);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-400">#</span>
            <h1 className="text-xl font-bold text-gray-900 line-clamp-1">{tag}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <p className="text-sm font-medium text-gray-600 mb-6">
          <span className="text-gray-900 font-bold">{documents.length}件</span> の資料で見つかりました
        </p>

        {documents.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 bg-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link to={`/document/${doc.id}`} className="block hover:underline">
                  <h2 className="text-lg font-bold text-gray-900 line-clamp-1">{doc.title}</h2>
                </Link>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset capitalize ${getTypeBadgeClass(doc.type)}`}>
                    {getLabel(DOCUMENT_TYPE_LABELS, doc.type, doc.type)}
                  </span>
                  {doc.authors && doc.authors.length > 0 && (
                    <span className="text-xs text-gray-500">{doc.authors.join(', ')}</span>
                  )}
                </div>
              </div>
              <Link
                to={`/document/${doc.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <BookOpen className="h-4 w-4" />
                資料を見る
              </Link>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* カテゴリーマッチ */}
              {doc.matchedCategories.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">カテゴリーとして設定</h3>
                  <div className="flex flex-wrap gap-2">
                    {doc.matchedCategories.map((c: string, i: number) => (
                      <span key={i} className="inline-flex items-center rounded bg-blue-50 text-blue-700 px-2 py-1 text-xs font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* セクションマッチ */}
              {doc.matchedSections.map((sec: any) => (
                <div key={sec.id} className="border-l-2 border-gray-200 pl-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {sec.title}
                    </h3>
                    {sec.keywords?.includes(tag) && sec.summary && (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
                        {sec.summary}
                      </p>
                    )}
                  </div>

                  {/* アイテムマッチ */}
                  {sec.matchedItems.length > 0 && (
                    <div className="space-y-3">
                      {sec.matchedItems.map((item: any) => (
                        <div key={item.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <h4 className="text-sm font-bold text-gray-900 mb-2">{item.title}</h4>
                          {item.summary && (
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.summary}</p>
                          )}
                          {item.detail && (
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mt-2">{item.detail}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* コネクションマッチ */}
              {doc.matchedConnections.map((conn: any) => (
                <div key={conn.id} className="border-l-2 border-purple-200 pl-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-purple-400" />
                    次に学ぶ: {conn.title}
                  </h3>
                  {conn.connection && (
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                      {conn.connection}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
