import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Brain, Play, RefreshCw } from 'lucide-react';

export default function Review() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 復習設定
  const [targetScope, setTargetScope] = useState<'all' | 'doc'>('all');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [order, setOrder] = useState<'sequential' | 'random' | 'weak'>('weak');

  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select(`id, title, sections (items (id, review_enabled))`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setDocuments(data || []);
      if (data && data.length > 0) {
        setSelectedDocId(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleStart = () => {
    let url = `/review/session?order=${order}`;
    if (targetScope === 'doc' && selectedDocId) {
      url += `&docId=${selectedDocId}`;
    }
    navigate(url);
  };

  // 全復習対象アイテム数を計算
  const totalReviewItems = documents.reduce((sum, doc) => {
    let count = 0;
    doc.sections?.forEach((sec: any) => {
      sec.items?.forEach((item: any) => {
        if (item.review_enabled) count++;
      });
    });
    return sum + count;
  }, 0);

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-full">
          <Brain className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">復習セッション</h1>
          <p className="text-sm text-gray-500">reviewEnabledがONの項目を復習します</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">復習する範囲</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" className="w-4 h-4 text-blue-600" name="scope"
                checked={targetScope === 'all'} onChange={() => setTargetScope('all')} />
              <span className="text-sm text-gray-800">すべての資料 (対象: {totalReviewItems}件)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" className="w-4 h-4 text-blue-600" name="scope"
                checked={targetScope === 'doc'} onChange={() => setTargetScope('doc')} />
              <span className="text-sm text-gray-800">特定の資料を選ぶ</span>
            </label>
            
            {targetScope === 'doc' && (
              <div className="pl-7 mt-2">
                <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)}>
                  {documents.map(doc => {
                    let c = 0;
                    doc.sections?.forEach((s:any) => s.items?.forEach((i:any) => { if(i.review_enabled) c++; }));
                    return (
                      <option key={doc.id} value={doc.id}>{doc.title} ({c}件)</option>
                    )
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">復習の順番</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className={`cursor-pointer flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${order === 'weak' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <input type="radio" name="order" className="sr-only" checked={order === 'weak'} onChange={() => setOrder('weak')} />
              <span className={`font-semibold ${order === 'weak' ? 'text-blue-700' : 'text-gray-700'}`}>苦手優先</span>
              <span className="text-xs text-center text-gray-500 mt-1">忘れがちな項目から</span>
            </label>
            <label className={`cursor-pointer flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${order === 'sequential' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <input type="radio" name="order" className="sr-only" checked={order === 'sequential'} onChange={() => setOrder('sequential')} />
              <span className={`font-semibold ${order === 'sequential' ? 'text-blue-700' : 'text-gray-700'}`}>資料順</span>
              <span className="text-xs text-center text-gray-500 mt-1">最初から順番に</span>
            </label>
            <label className={`cursor-pointer flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${order === 'random' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <input type="radio" name="order" className="sr-only" checked={order === 'random'} onChange={() => setOrder('random')} />
              <span className={`font-semibold ${order === 'random' ? 'text-blue-700' : 'text-gray-700'}`}>ランダム</span>
              <span className="text-xs text-center text-gray-500 mt-1">順序をシャッフル</span>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={loading || totalReviewItems === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 text-base font-bold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition-all"
      >
        {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
        復習をスタート
      </button>
    </div>
  );
}
