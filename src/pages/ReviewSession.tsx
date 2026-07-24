import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, HelpCircle, Eye, LogOut } from 'lucide-react';

type ReviewItem = {
  id: string;
  title: string;
  summary: string | null;
  detail: string | null;
  review_prompt: string | null;
  keywords: string[];
  section_title: string;
  document_title: string;
  last_result: string | null;
};

export default function ReviewSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const order = searchParams.get('order') || 'sequential';
  const docId = searchParams.get('docId');

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReviewItems();
  }, []);

  const fetchReviewItems = async () => {
    setLoading(true);
    
    // items, sections, documents, review_logs を一括取得
    let query = supabase
      .from('items')
      .select(`
        id, title, summary, detail, review_prompt, keywords, review_enabled,
        sections!inner (
          id, title,
          documents!inner (id, title)
        ),
        review_logs (result, reviewed_at)
      `)
      .eq('review_enabled', true);

    if (docId) {
      query = query.eq('sections.documents.id', docId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // データの整形
    let formattedItems: ReviewItem[] = data.map((item: any) => {
      // 最新の review_log を取得
      let lastResult = null;
      if (item.review_logs && item.review_logs.length > 0) {
        // reviewed_atの降順ソート
        const sortedLogs = [...item.review_logs].sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime());
        lastResult = sortedLogs[0].result;
      }

      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        detail: item.detail,
        review_prompt: item.review_prompt,
        keywords: item.keywords || [],
        section_title: item.sections?.title || 'Unknown Section',
        document_title: item.sections?.documents?.title || 'Unknown Document',
        last_result: lastResult
      };
    });

    // ソート処理
    if (order === 'random') {
      formattedItems.sort(() => Math.random() - 0.5);
    } else if (order === 'weak') {
      const getScore = (result: string | null) => {
        if (result === 'forgot') return 3;
        if (result === 'uncertain') return 2;
        if (result === null) return 1;
        if (result === 'understood') return 0;
        return 1;
      };
      formattedItems.sort((a, b) => getScore(b.last_result) - getScore(a.last_result));
    }
    // sequential の場合は取得順（概ねそのまま）

    setItems(formattedItems);
    setLoading(false);
  };

  const handleResult = async (result: 'understood' | 'uncertain' | 'forgot') => {
    if (saving) return;
    setSaving(true);
    const currentItem = items[currentIndex];
    
    // DBに記録
    await supabase.from('review_logs').insert({
      item_id: currentItem.id,
      result: result
    });

    setSaving(false);
    
    // 次へ
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setFinished(true);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">読み込み中...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4 p-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">復習する項目がありません</h2>
        <button onClick={() => navigate('/review')} className="text-blue-600 font-medium">設定に戻る</button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6 p-4 animate-in zoom-in duration-300">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-200">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">復習完了！</h2>
          <p className="text-gray-500 mb-8">{items.length}件の項目を復習しました。</p>
          <button
            onClick={() => navigate('/review')}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold hover:bg-blue-500 transition-colors"
          >
            終了する
          </button>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-safe">
      {/* ヘッダー＆プログレス */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-gray-200 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/review')} className="text-gray-500 hover:text-gray-900 p-1 rounded-md transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
          <div className="text-sm font-bold text-gray-700">
            {currentIndex + 1} <span className="text-gray-400 font-medium mx-1">/</span> {items.length}
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex) / items.length) * 100}%` }}
          ></div>
        </div>
      </header>

      {/* メインカード領域 */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-2xl mx-auto w-full relative">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col overflow-y-auto">
          {/* パンくず */}
          <div className="text-[10px] sm:text-xs font-bold tracking-wide text-gray-400 uppercase mb-4 flex flex-wrap gap-2">
            <span>{currentItem.document_title}</span>
            <span className="text-gray-300">/</span>
            <span>{currentItem.section_title}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 leading-tight">
            {currentItem.title}
          </h2>

          {currentItem.review_prompt && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
              <div className="text-xs font-bold text-blue-600 uppercase mb-1">問い</div>
              <p className="text-base text-blue-900 font-medium">{currentItem.review_prompt}</p>
            </div>
          )}

          {!showAnswer && (
            <div className="flex-1 flex items-center justify-center min-h-[150px]">
              <button
                onClick={() => setShowAnswer(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-800 transition-transform active:scale-95"
              >
                <Eye className="h-5 w-5" /> 答えを見る
              </button>
            </div>
          )}

          {showAnswer && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-20">
              {currentItem.summary && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">概要</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{currentItem.summary}</p>
                </div>
              )}
              {currentItem.detail && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">詳細</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{currentItem.detail}</p>
                </div>
              )}
              {currentItem.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentItem.keywords.map((k, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">#{k}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 評価アクションバー */}
        {showAnswer && (
          <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:right-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-gray-200/50 grid grid-cols-3 gap-2">
              <button
                disabled={saving}
                onClick={() => handleResult('forgot')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold">わからなかった</span>
              </button>
              <button
                disabled={saving}
                onClick={() => handleResult('uncertain')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <HelpCircle className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold">あいまい</span>
              </button>
              <button
                disabled={saving}
                onClick={() => handleResult('understood')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold">わかった</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
