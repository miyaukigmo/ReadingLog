import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Hash, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Tags() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'category' | 'keyword' | 'connection'>('all');
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
        connections (*)
      `);

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const tagCounts = useMemo(() => {
    const counts: Record<string, { count: number; types: Set<'category' | 'keyword' | 'connection'> }> = {};

    const addTag = (name: string, type: 'category' | 'keyword' | 'connection') => {
      if (!counts[name]) counts[name] = { count: 0, types: new Set() };
      counts[name].count++;
      counts[name].types.add(type);
    };

    documents.forEach(doc => {
      // 1. カテゴリー
      doc.categories?.forEach((c: string) => addTag(c, 'category'));

      // 2. セクションキーワード
      doc.sections?.forEach((sec: any) => {
        sec.keywords?.forEach((k: string) => addTag(k, 'keyword'));

        // 3. アイテムキーワード
        sec.items?.forEach((item: any) => {
          item.keywords?.forEach((k: string) => addTag(k, 'keyword'));
        });
      });

      // 4. つながり（検索キーワード・開始点）
      doc.connections?.forEach((conn: any) => {
        conn.search_keywords?.forEach((k: string) => addTag(k, 'connection'));
        conn.starting_points?.forEach((k: string) => addTag(k, 'connection'));
      });
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, count: data.count, types: Array.from(data.types) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  }, [documents]);

  const filteredTags = useMemo(() => {
    let filtered = tagCounts;
    
    // タブでフィルタリング
    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.types.includes(activeTab));
    }

    // 検索でフィルタリング
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [tagCounts, searchQuery, activeTab]);

  const getTagColorClass = (types: string[]) => {
    if (types.includes('category')) return 'bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-400';
    if (types.includes('connection')) return 'bg-purple-50 border-purple-200 text-purple-800 hover:border-purple-400';
    return 'bg-green-50 border-green-200 text-green-800 hover:border-green-400'; // keyword default
  };
  
  const getBadgeColorClass = (types: string[]) => {
    if (types.includes('category')) return 'bg-blue-200 text-blue-900';
    if (types.includes('connection')) return 'bg-purple-200 text-purple-900';
    return 'bg-green-200 text-green-900';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-900">
            <Hash className="h-6 w-6 text-gray-900" />
            <h1 className="text-xl font-bold tracking-tight">Keywords / Tags</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="キーワードを検索..."
              className="block w-full rounded-md border-0 py-2.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm bg-gray-50/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* タブ */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto shrink-0">
            {(['all', 'category', 'keyword', 'connection'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'all' && 'すべて'}
                {tab === 'category' && 'ジャンル'}
                {tab === 'keyword' && 'トピック'}
                {tab === 'connection' && 'つながり'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {filteredTags.map(tag => (
                <button
                  key={tag.name}
                  onClick={() => navigate(`/tags/${encodeURIComponent(tag.name)}`)}
                  className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all hover:shadow-sm hover:bg-white hover:-translate-y-0.5 active:scale-95 ${getTagColorClass(tag.types)}`}
                >
                  <span className="text-sm font-medium">
                    {tag.name}
                  </span>
                  <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getBadgeColorClass(tag.types)}`}>
                    {tag.count}
                  </span>
                </button>
              ))}
              {filteredTags.length === 0 && (
                <p className="text-gray-500 text-sm">該当するキーワードがありません。</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
