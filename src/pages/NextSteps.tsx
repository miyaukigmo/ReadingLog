import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Search, Star, Link as LinkIcon } from 'lucide-react';
import { HighlightText } from '@/components/HighlightText';
import { CONNECTION_TYPE_LABELS, CONNECTION_BASIS_LABELS, getLabel, getTypeBadgeClass, DOCUMENT_TYPE_LABELS } from '@/lib/constants';

export default function NextSteps() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        documents (
          id,
          title,
          type,
          purpose
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  };

  const toggleFavorite = async (connId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    
    // Optimistic update
    setConnections(prev => prev.map(conn => 
      conn.id === connId ? { ...conn, is_favorite: newStatus } : conn
    ));

    const { error } = await supabase
      .from('connections')
      .update({ is_favorite: newStatus })
      .eq('id', connId);
      
    if (error) {
      console.error('Error updating favorite status:', error);
      // Revert
      setConnections(prev => prev.map(conn => 
        conn.id === connId ? { ...conn, is_favorite: currentStatus } : conn
      ));
    }
  };

  const filteredConnections = useMemo(() => {
    return connections.filter(conn => {
      if (filterFavorite && !conn.is_favorite) return false;
      
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      
      return (
        (conn.title && conn.title.toLowerCase().includes(q)) ||
        (conn.connection && conn.connection.toLowerCase().includes(q)) ||
        (conn.question && conn.question.toLowerCase().includes(q)) ||
        (conn.starting_points && conn.starting_points.some((p: string) => p.toLowerCase().includes(q))) ||
        (conn.search_keywords && conn.search_keywords.some((k: string) => k.toLowerCase().includes(q))) ||
        (conn.documents?.title && conn.documents.title.toLowerCase().includes(q))
      );
    });
  }, [connections, searchQuery, filterFavorite]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-900">
            <Compass className="h-6 w-6 text-gray-900" />
            <h1 className="text-xl font-bold tracking-tight">Next Steps</h1>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={() => setFilterFavorite(!filterFavorite)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors border ${
                filterFavorite 
                  ? 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Star className={`h-4 w-4 ${filterFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
              お気に入りのみ
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="タイトル、つながり、問いなどで検索..."
              className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 text-sm sm:leading-6 bg-gray-50/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : filteredConnections.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            該当するつながりがありません。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConnections.map((conn) => (
              <div 
                key={conn.id} 
                onClick={() => navigate(`/document/${conn.document_id}?tab=connections`)}
                className="group relative flex flex-col rounded-xl bg-white shadow-sm border border-purple-100 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-2 rounded-t-xl">
                  <div>
                    <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 mb-2">
                      {getLabel(CONNECTION_TYPE_LABELS, conn.type, conn.type)}
                    </span>
                    <h2 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                      <HighlightText text={conn.title} query={searchQuery} />
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={(e) => toggleFavorite(conn.id, conn.is_favorite, e)}
                      className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                      title={conn.is_favorite ? "お気に入りから外す" : "お気に入りに追加"}
                    >
                      <Star className={`h-5 w-5 ${conn.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    </button>
                    {conn.basis && (
                      <span className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {getLabel(CONNECTION_BASIS_LABELS, conn.basis, conn.basis)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-4 space-y-4 flex-1">
                  {conn.connection && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">なぜつながるか</h4>
                      <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                        <HighlightText text={conn.connection} query={searchQuery} />
                      </p>
                    </div>
                  )}
                  {conn.question && (
                    <div>
                      <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">さらに考えたい問い</h4>
                      <p className="text-sm text-gray-800 font-medium line-clamp-2">
                        <HighlightText text={conn.question} query={searchQuery} />
                      </p>
                    </div>
                  )}
                  {((conn.starting_points && conn.starting_points.length > 0) || (conn.search_keywords && conn.search_keywords.length > 0)) && (
                    <div className="pt-3 border-t border-gray-100 space-y-3">
                      {conn.starting_points && conn.starting_points.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 mb-1">入口となる人物・概念・文献</h4>
                          <div className="flex flex-wrap gap-1">
                            {conn.starting_points.map((p: string, i: number) => (
                              <span key={i} className="inline-flex items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
                                <HighlightText text={p} query={searchQuery} />
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {conn.search_keywords && conn.search_keywords.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 mb-1">検索キーワード</h4>
                          <div className="flex flex-wrap gap-1">
                            {conn.search_keywords.map((k: string, i: number) => (
                              <span key={i} className="inline-flex items-center rounded-sm border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600">
                                <Search className="h-3 w-3 mr-1 text-gray-400" />
                                <HighlightText text={k} query={searchQuery} />
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {conn.documents && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between rounded-b-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 truncate">{conn.documents.title}</span>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset capitalize ${getTypeBadgeClass(conn.documents.type)}`}>
                      {getLabel(DOCUMENT_TYPE_LABELS, conn.documents.type, conn.documents.type)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
