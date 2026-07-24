import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

// 一意なID生成 (ブラウザ標準)
const generateId = () => crypto.randomUUID();

export default function DocumentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 削除対象のIDを記録
  const [deletedSections, setDeletedSections] = useState<string[]>([]);
  const [deletedItems, setDeletedItems] = useState<string[]>([]);

  useEffect(() => {
    if (id) fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        sections (
          *,
          items (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
      navigate('/');
    } else {
      data.sections?.sort((a: any, b: any) => a.sort_order - b.sort_order);
      data.sections?.forEach((sec: any) => {
        sec.items?.sort((a: any, b: any) => a.sort_order - b.sort_order);
      });
      setDoc(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Document更新
      const { error: docError } = await supabase
        .from('documents')
        .update({
          title: doc.title,
          type: doc.type,
          authors: doc.authors,
          categories: doc.categories,
          summary: doc.summary,
          notebook_lm_report: doc.notebook_lm_report,
          key_points: doc.key_points,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);
      
      if (docError) throw docError;

      // 2. 削除処理
      if (deletedItems.length > 0) {
        // Temp IDはDBにないので除外
        const validIds = deletedItems.filter(i => !i.startsWith('temp_'));
        if (validIds.length > 0) {
          await supabase.from('items').delete().in('id', validIds);
        }
      }
      if (deletedSections.length > 0) {
        const validIds = deletedSections.filter(i => !i.startsWith('temp_'));
        if (validIds.length > 0) {
          await supabase.from('sections').delete().in('id', validIds);
        }
      }

      // 3. Sections Upsert
      const sectionsToUpsert = doc.sections.map((sec: any, idx: number) => ({
        id: sec.id.startsWith('temp_') ? generateId() : sec.id, // 新規なら新しいID
        document_id: doc.id,
        title: sec.title,
        summary: sec.summary || null,
        sort_order: idx,
        // _oldIdを使ってItemとの紐付けを維持する
        _oldId: sec.id, 
      }));

      // Temp IDのものを抽出してInsert, 既存のものはUpdateに分けた方が安全だがUpsertで一気にやる
      for (const sec of sectionsToUpsert) {
        const payload = {
          id: sec.id,
          document_id: sec.document_id,
          title: sec.title,
          summary: sec.summary,
          sort_order: sec.sort_order,
          updated_at: new Date().toISOString(),
        };
        const { error: secErr } = await supabase.from('sections').upsert(payload);
        if (secErr) throw secErr;
      }

      // 4. Items Upsert
      for (const sec of doc.sections) {
        // Upsert後の新しいSection IDを探す
        const matchedSec = sectionsToUpsert.find((s: any) => s._oldId === sec.id);
        const newSecId = matchedSec ? matchedSec.id : sec.id;

        for (const [itemIdx, item] of sec.items.entries()) {
          const payload = {
            id: item.id.startsWith('temp_') ? generateId() : item.id,
            section_id: newSecId,
            title: item.title,
            summary: item.summary || null,
            detail: item.detail || null,
            review_prompt: item.review_prompt || null,
            review_enabled: item.review_enabled,
            keywords: item.keywords || [],
            sort_order: itemIdx,
            verification_status: item.verification_status,
            updated_at: new Date().toISOString(),
          };
          const { error: itemErr } = await supabase.from('items').upsert(payload);
          if (itemErr) throw itemErr;
        }
      }

      navigate(`/document/${doc.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // --- ヘルパー関数 ---
  const updateDocField = (field: string, value: any) => {
    setDoc({ ...doc, [field]: value });
  };

  // 文字列配列(カンマ区切り)の編集用
  const handleStringArray = (field: string, val: string) => {
    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
    updateDocField(field, arr);
  };

  // Section 操作
  const addSection = () => {
    const newSec = { id: `temp_${generateId()}`, title: '新しいセクション', summary: '', items: [] };
    setDoc({ ...doc, sections: [...(doc.sections || []), newSec] });
  };
  const removeSection = (secId: string) => {
    setDeletedSections([...deletedSections, secId]);
    setDoc({ ...doc, sections: doc.sections.filter((s: any) => s.id !== secId) });
  };
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSecs = [...doc.sections];
    if (direction === 'up' && index > 0) {
      [newSecs[index - 1], newSecs[index]] = [newSecs[index], newSecs[index - 1]];
    } else if (direction === 'down' && index < newSecs.length - 1) {
      [newSecs[index + 1], newSecs[index]] = [newSecs[index], newSecs[index + 1]];
    }
    setDoc({ ...doc, sections: newSecs });
  };
  const updateSection = (secId: string, field: string, value: any) => {
    setDoc({
      ...doc,
      sections: doc.sections.map((s: any) => s.id === secId ? { ...s, [field]: value } : s)
    });
  };

  // Item 操作
  const addItem = (secId: string) => {
    const newItem = {
      id: `temp_${generateId()}`,
      title: '新しい項目',
      summary: '',
      detail: '',
      review_prompt: '',
      review_enabled: true,
      keywords: [],
      verification_status: 'unverified'
    };
    setDoc({
      ...doc,
      sections: doc.sections.map((s: any) => s.id === secId ? { ...s, items: [...(s.items || []), newItem] } : s)
    });
  };
  const removeItem = (secId: string, itemId: string) => {
    setDeletedItems([...deletedItems, itemId]);
    setDoc({
      ...doc,
      sections: doc.sections.map((s: any) => s.id === secId ? { ...s, items: s.items.filter((i: any) => i.id !== itemId) } : s)
    });
  };
  const moveItem = (secId: string, index: number, direction: 'up' | 'down') => {
    setDoc({
      ...doc,
      sections: doc.sections.map((s: any) => {
        if (s.id !== secId) return s;
        const newItems = [...s.items];
        if (direction === 'up' && index > 0) {
          [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        } else if (direction === 'down' && index < newItems.length - 1) {
          [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
        }
        return { ...s, items: newItems };
      })
    });
  };
  const updateItem = (secId: string, itemId: string, field: string, value: any) => {
    setDoc({
      ...doc,
      sections: doc.sections.map((s: any) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          items: s.items.map((i: any) => i.id === itemId ? { ...i, [field]: value } : i)
        };
      })
    });
  };

  if (loading) return <div className="text-center py-20 text-gray-500">読み込み中...</div>;
  if (!doc) return null;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* 画面上部ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/document/${doc.id}`)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 line-clamp-1">編集: {doc.title}</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* 資料情報編集 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">資料情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">タイトル</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={doc.title} onChange={e => updateDocField('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">タイプ</label>
              <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={doc.type} onChange={e => updateDocField('type', e.target.value)}>
                <option value="book">Book</option>
                <option value="paper">Paper</option>
                <option value="article">Article</option>
                <option value="report">Report</option>
                <option value="lecture">Lecture</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">著者 (カンマ区切り)</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={(doc.authors || []).join(', ')} onChange={e => handleStringArray('authors', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">カテゴリー (カンマ区切り)</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={(doc.categories || []).join(', ')} onChange={e => handleStringArray('categories', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">資料全体のまとめ</label>
              <textarea className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
                value={doc.summary || ''} onChange={e => updateDocField('summary', e.target.value)} />
            </div>
            <div className="sm:col-span-2 mt-4">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-900 border-t border-gray-100 pt-4">
                NotebookLM レポート (.md)
              </label>
              <p className="text-xs text-gray-500 mb-2">NotebookLM等のAIで生成したマークダウン形式のまとめをここに貼り付けられます。</p>
              <textarea className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[150px] font-mono"
                value={doc.notebook_lm_report || ''} onChange={e => updateDocField('notebook_lm_report', e.target.value)} placeholder="# 全体の要約&#13;&#10;この資料は..." />
            </div>
          </div>
        </section>

        {/* セクション編集 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">セクション一覧</h2>
            <button onClick={addSection} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
              <Plus className="h-4 w-4" /> セクション追加
            </button>
          </div>

          {doc.sections?.map((sec: any, secIdx: number) => (
            <div key={sec.id} className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
              {/* セクションヘッダー・編集 */}
              <div className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6 space-y-4 relative">
                <div className="absolute right-4 top-4 flex flex-col gap-1">
                  <button onClick={() => moveSection(secIdx, 'up')} disabled={secIdx === 0} className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button>
                  <button onClick={() => moveSection(secIdx, 'down')} disabled={secIdx === doc.sections.length - 1} className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
                  <button onClick={() => removeSection(sec.id)} className="p-1 text-red-400 hover:text-red-600 mt-2"><Trash2 className="h-4 w-4"/></button>
                </div>
                
                <div className="pr-12 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">セクションタイトル</label>
                    <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-bold"
                      value={sec.title} onChange={e => updateSection(sec.id, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">セクションまとめ</label>
                    <textarea className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[60px]"
                      value={sec.summary || ''} onChange={e => updateSection(sec.id, 'summary', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 項目編集 */}
              <div className="p-4 sm:p-6 space-y-4 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-sm font-bold text-gray-700">項目一覧</h3>
                  <button onClick={() => addItem(sec.id)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    <Plus className="h-3 w-3" /> 項目追加
                  </button>
                </div>

                <div className="space-y-4">
                  {sec.items?.map((item: any, itemIdx: number) => (
                    <div key={item.id} className="relative rounded-lg border border-gray-200 p-4 pl-12 bg-gray-50/50">
                      <div className="absolute left-2 top-4 flex flex-col gap-1 items-center">
                        <button onClick={() => moveItem(sec.id, itemIdx, 'up')} disabled={itemIdx === 0} className="text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button>
                        <span className="text-xs font-medium text-gray-400">{itemIdx + 1}</span>
                        <button onClick={() => moveItem(sec.id, itemIdx, 'down')} disabled={itemIdx === sec.items.length - 1} className="text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
                      </div>
                      <div className="absolute right-3 top-3">
                        <button onClick={() => removeItem(sec.id, item.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-gray-200">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </div>

                      <div className="space-y-3 pr-10">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">項目タイトル</label>
                          <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-bold"
                            value={item.title} onChange={e => updateItem(sec.id, item.id, 'title', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">概要 (summary)</label>
                          <textarea className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm min-h-[50px]"
                            value={item.summary || ''} onChange={e => updateItem(sec.id, item.id, 'summary', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">詳細 (detail)</label>
                          <textarea className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm min-h-[80px]"
                            value={item.detail || ''} onChange={e => updateItem(sec.id, item.id, 'detail', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600">復習用の問い (reviewPrompt)</label>
                          <input type="text" className="mt-1 block w-full rounded-md border border-blue-200 bg-blue-50/30 px-3 py-1.5 text-sm"
                            value={item.review_prompt || ''} onChange={e => updateItem(sec.id, item.id, 'review_prompt', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={item.review_enabled} onChange={e => updateItem(sec.id, item.id, 'review_enabled', e.target.checked)} />
                            <span className="text-xs font-medium text-gray-700">復習対象にする</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              checked={item.verification_status === 'verified'} onChange={e => updateItem(sec.id, item.id, 'verification_status', e.target.checked ? 'verified' : 'unverified')} />
                            <span className="text-xs font-medium text-gray-700">確認済みにする</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sec.items?.length === 0 && (
                    <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      項目がありません
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
