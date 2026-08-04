import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';

export default function QuickFlashcard() {
  const [isOpen, setIsOpen] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Quick Flashcards ドキュメントを探す（または作成）
      let docId = '';
      const { data: docs, error: docErr } = await supabase
        .from('documents')
        .select('id')
        .eq('title', 'Quick Flashcards')
        .limit(1);

      if (docErr) throw docErr;

      if (docs && docs.length > 0) {
        docId = docs[0].id;
      } else {
        const { data: newDoc, error: newDocErr } = await supabase
          .from('documents')
          .insert({
            title: 'Quick Flashcards',
            type: 'other',
            purpose: 'study',
            summary: '右下のボタンからサクッと追加されたフラッシュカード集です。',
          })
          .select('id')
          .single();
        
        if (newDocErr) throw newDocErr;
        docId = newDoc.id;
      }

      // 2. Inbox セクションを探す（または作成）
      let secId = '';
      const { data: secs, error: secErr } = await supabase
        .from('sections')
        .select('id')
        .eq('document_id', docId)
        .eq('title', 'Inbox')
        .limit(1);

      if (secErr) throw secErr;

      if (secs && secs.length > 0) {
        secId = secs[0].id;
      } else {
        const { data: newSec, error: newSecErr } = await supabase
          .from('sections')
          .insert({
            document_id: docId,
            title: 'Inbox',
            sort_order: 0,
          })
          .select('id')
          .single();
        
        if (newSecErr) throw newSecErr;
        secId = newSec.id;
      }

      // 3. Item として保存する
      const { error: itemErr } = await supabase
        .from('items')
        .insert({
          section_id: secId,
          title: front.trim(),
          detail: back.trim(),
          summary: 'クイックフラッシュカード',
          review_enabled: true,
          verification_status: 'verified',
          sort_order: Date.now(), // 簡易的なソート順
        });

      if (itemErr) throw itemErr;

      // 成功時
      showToast('カードを追加しました！✨');
      setFront('');
      setBack('');
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('保存に失敗しました: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* フローティングアクションボタン (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-110 active:scale-95 group"
        aria-label="一問一答を追加"
      >
        <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Plus className="h-7 w-7" />
      </button>

      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 md:bottom-28 md:right-10 z-50 animate-in slide-in-from-bottom-5 fade-in rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* モーダル背景 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          {/* モーダル本体 */}
          <div className="relative w-full max-w-md scale-100 overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 sm:p-8">
              <h2 className="mb-1 text-xl font-bold text-gray-900">一問一答を追加</h2>
              <p className="mb-6 text-sm text-gray-500">
                復習用のフラッシュカードをサクッと登録できます。
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="front" className="mb-1.5 block text-sm font-bold text-gray-700">
                    問題 (Front)
                  </label>
                  <input
                    id="front"
                    type="text"
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder="例: Reactの開発元は？"
                    className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none border"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="back" className="mb-1.5 block text-sm font-bold text-gray-700">
                    答え (Back)
                  </label>
                  <textarea
                    id="back"
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder="例: Meta (旧Facebook)"
                    rows={3}
                    className="w-full resize-none rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none border"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !front.trim() || !back.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      '保存して閉じる'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
