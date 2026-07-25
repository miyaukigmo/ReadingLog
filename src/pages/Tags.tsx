import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Hash, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Tags() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    const counts: Record<string, number> = {};

    documents.forEach(doc => {
      // 1. カテゴリー
      doc.categories?.forEach((c: string) => {
        counts[c] = (counts[c] || 0) + 1;
      });

      // 2. セクションキーワード
      doc.sections?.forEach((sec: any) => {
        sec.keywords?.forEach((k: string) => {
          counts[k] = (counts[k] || 0) + 1;
        });

        // 3. アイテムキーワード
        sec.items?.forEach((item: any) => {
          item.keywords?.forEach((k: string) => {
            counts[k] = (counts[k] || 0) + 1;
          });
        });
      });

      // 4. つながり（検索キーワード・開始点）
      doc.connections?.forEach((conn: any) => {
        conn.search_keywords?.forEach((k: string) => {
          counts[k] = (counts[k] || 0) + 1;
        });
        conn.starting_points?.forEach((k: string) => {
          counts[k] = (counts[k] || 0) + 1;
        });
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  }, [documents]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagCounts;
    const q = searchQuery.toLowerCase();
    return tagCounts.filter(t => t.name.toLowerCase().includes(q));
  }, [tagCounts, searchQuery]);

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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="キーワードを検索..."
            className="block w-full rounded-md border-0 py-2 text-gray-900 focus:ring-0 placeholder:text-gray-400 sm:text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
                  className="group flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 pl-3 pr-2 py-1.5 hover:border-gray-400 hover:bg-white transition-all hover:shadow-sm"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {tag.name}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600">
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
