import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, Link as LinkIcon, Database } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_PURPOSE_LABELS, CONNECTION_TYPE_LABELS, CONNECTION_BASIS_LABELS } from '@/lib/constants';

const generateId = () => crypto.randomUUID();

export default function DocumentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletedSections, setDeletedSections] = useState<string[]>([]);
  const [deletedItems, setDeletedItems] = useState<string[]>([]);
  const [deletedConnections, setDeletedConnections] = useState<string[]>([]);

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
        ),
        connections (*)
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
      data.connections?.sort((a: any, b: any) => a.sort_order - b.sort_order);
      if (!data.connections) data.connections = [];
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
          purpose: doc.purpose || 'study',
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
        const validIds = deletedItems.filter(i => !i.startsWith('temp_'));
        if (validIds.length > 0) {
          const { error: err } = await supabase.from('items').delete().in('id', validIds);
          if (err) throw err;
        }
      }
      if (deletedSections.length > 0) {
        const validIds = deletedSections.filter(i => !i.startsWith('temp_'));
        if (validIds.length > 0) {
          const { error: err } = await supabase.from('sections').delete().in('id', validIds);
          if (err) throw err;
        }
      }
      if (deletedConnections.length > 0) {
        const validIds = deletedConnections.filter(i => !i.startsWith('temp_'));
        if (validIds.length > 0) {
          const { error: err } = await supabase.from('connections').delete().in('id', validIds);
          if (err) throw err;
        }
      }

      // 3. Sections Upsert
      const sectionsToUpsert = doc.sections.map((sec: any, idx: number) => ({
        id: sec.id.startsWith('temp_') ? generateId() : sec.id,
        document_id: doc.id,
        title: sec.title,
        summary: sec.summary || null,
        original_text: sec.original_text || '',
        archive_report: sec.archive_report || '',
        keywords: sec.keywords || [],
        sort_order: idx,
        _oldId: sec.id, 
      }));

      for (const sec of sectionsToUpsert) {
        const payload = {
          id: sec.id,
          document_id: sec.document_id,
          title: sec.title,
          summary: sec.summary,
          original_text: sec.original_text,
          archive_report: sec.archive_report,
          keywords: sec.keywords,
          sort_order: sec.sort_order,
          updated_at: new Date().toISOString(),
        };
        const { error: secErr } = await supabase.from('sections').upsert(payload);
        if (secErr) throw secErr;
      }

      // 4. Items Upsert
      for (const sec of doc.sections) {
        const matchedSec = sectionsToUpsert.find((s: any) => s._oldId === sec.id);
        const newSecId = matchedSec ? matchedSec.id : sec.id;

        if (!sec.items) continue;

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

      // 5. Connections Upsert
      if (doc.connections) {
        for (const [connIdx, conn] of doc.connections.entries()) {
          const payload = {
            id: conn.id.startsWith('temp_') ? generateId() : conn.id,
            document_id: doc.id,
            type: conn.type || 'other',
            title: conn.title || '',
            connection: conn.connection || '',
            question: conn.question || '',
            starting_points: conn.starting_points || [],
            search_keywords: conn.search_keywords || [],
            basis: conn.basis || 'inferred',
            sort_order: connIdx,
            updated_at: new Date().toISOString(),
          };
          const { error: connErr } = await supabase.from('connections').upsert(payload);
          if (connErr) throw connErr;
        }
      }

      navigate(`/document/${doc.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '保存に失敗しました。どこまで保存されたか確認してください。');
    } finally {
      setSaving(false);
    }
  };

  const handlePurposeChange = (newPurpose: string) => {
    if (newPurpose === doc.purpose) return;
    
    const confirm = window.confirm(
      "【確認】\n表示される画面と主要機能が切り替わりますが、既存の学習項目やアーカイブ本文は削除されません（裏側で保持されます）。\n用途を変更しますか？"
    );
    
    if (confirm) {
      setDoc({ ...doc, purpose: newPurpose });
    }
  };

  const updateDocField = (field: string, value: any) => {
    setDoc({ ...doc, [field]: value });
  };

  const handleStringArray = (field: string, val: string) => {
    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
    updateDocField(field, arr);
  };

  // Section 操作
  const addSection = () => {
    const newSec = { id: `temp_${generateId()}`, title: '新しいセクション', summary: '', original_text: '', archive_report: '', keywords: [], items: [] };
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
  const handleSectionKeywords = (secId: string, val: string) => {
    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
    updateSection(secId, 'keywords', arr);
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

  // Connection 操作
  const addConnection = () => {
    const newConn = {
      id: `temp_${generateId()}`,
      type: 'other',
      title: '新しいつながり',
      connection: '',
      question: '',
      starting_points: [],
      search_keywords: [],
      basis: 'inferred'
    };
    setDoc({ ...doc, connections: [...(doc.connections || []), newConn] });
  };
  const removeConnection = (connId: string) => {
    setDeletedConnections([...deletedConnections, connId]);
    setDoc({ ...doc, connections: doc.connections.filter((c: any) => c.id !== connId) });
  };
  const moveConnection = (index: number, direction: 'up' | 'down') => {
    const newConns = [...doc.connections];
    if (direction === 'up' && index > 0) {
      [newConns[index - 1], newConns[index]] = [newConns[index], newConns[index - 1]];
    } else if (direction === 'down' && index < newConns.length - 1) {
      [newConns[index + 1], newConns[index]] = [newConns[index], newConns[index + 1]];
    }
    setDoc({ ...doc, connections: newConns });
  };
  const updateConnection = (connId: string, field: string, value: any) => {
    setDoc({
      ...doc,
      connections: doc.connections.map((c: any) => c.id === connId ? { ...c, [field]: value } : c)
    });
  };
  const handleConnectionArray = (connId: string, field: string, val: string) => {
    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
    updateConnection(connId, field, arr);
  };


  if (loading) return <div className="text-center py-20 text-gray-500">読み込み中...</div>;
  if (!doc) return null;

  const isArchive = doc.purpose === 'archive';

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* 画面上部ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/document/${doc.id}`)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 line-clamp-1">
              編集: {doc.title}
            </h1>
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
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 font-medium whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* 資料情報編集 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">資料情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">タイトル</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-bold"
                value={doc.title} onChange={e => updateDocField('title', e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">用途 (Purpose)</label>
              <select className="mt-1 block w-full rounded-md border border-purple-300 px-3 py-2 text-sm bg-purple-50 font-bold"
                value={doc.purpose} onChange={e => handlePurposeChange(e.target.value)}>
                {Object.entries(DOCUMENT_PURPOSE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">タイプ (Type)</label>
              <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={doc.type} onChange={e => updateDocField('type', e.target.value)}>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">著者 (カンマ区切り)</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={(doc.authors || []).join(', ')} onChange={e => handleStringArray('authors', e.target.value)} />
            </div>
            <div>
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
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-600" />
              セクション一覧
            </h2>
            <button onClick={addSection} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md">
              <Plus className="h-4 w-4" /> セクション追加
            </button>
          </div>

          {doc.sections?.map((sec: any, secIdx: number) => (
            <div key={sec.id} className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
              {/* セクションヘッダー・共通編集 */}
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
                  
                  {isArchive && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">キーワード (カンマ区切り)</label>
                      <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        value={(sec.keywords || []).join(', ')} onChange={e => handleSectionKeywords(sec.id, e.target.value)} placeholder="例: SF, 人工知能" />
                    </div>
                  )}
                </div>
              </div>

              {/* アーカイブ用セクションUI */}
              {isArchive ? (
                <div className="p-4 sm:p-6 space-y-6 bg-white">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">短い概要 (Summary)</label>
                    <textarea className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                      value={sec.summary || ''} onChange={e => updateSection(sec.id, 'summary', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">詳しい整理 (Archive Report / Markdown)</label>
                    <textarea className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[200px] font-mono resize-y"
                      value={sec.archive_report || ''} onChange={e => updateSection(sec.id, 'archive_report', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">原文 (Original Text)</label>
                    <p className="text-xs text-gray-500 mb-2">入力した改行・空行はそのまま維持されます。Markdown変換はされません。</p>
                    <textarea className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[300px] resize-y"
                      value={sec.original_text || ''} onChange={e => updateSection(sec.id, 'original_text', e.target.value)} />
                  </div>
                </div>
              ) : (
                /* 従来のItems編集UI */
                <div className="p-4 sm:p-6 space-y-4 bg-white">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">セクションまとめ</label>
                      <textarea className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[60px]"
                        value={sec.summary || ''} onChange={e => updateSection(sec.id, 'summary', e.target.value)} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 pt-4">
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
              )}
            </div>
          ))}
        </div>

        {/* Connections 編集 (アーカイブ専用) */}
        {isArchive && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <LinkIcon className="h-6 w-6 text-purple-600" />
                次に学ぶ (Connections)
              </h2>
              <button onClick={addConnection} className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-md">
                <Plus className="h-4 w-4" /> つながりを追加
              </button>
            </div>

            <div className="space-y-4">
              {doc.connections?.map((conn: any, idx: number) => (
                <div key={conn.id} className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden relative">
                  <div className="absolute right-4 top-4 flex flex-col gap-1 z-10">
                    <button onClick={() => moveConnection(idx, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button>
                    <button onClick={() => moveConnection(idx, 'down')} disabled={idx === doc.connections.length - 1} className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
                    <button onClick={() => removeConnection(conn.id)} className="p-1 text-red-400 hover:text-red-600 mt-2"><Trash2 className="h-4 w-4"/></button>
                  </div>

                  <div className="p-4 sm:p-6 pr-12 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">種類</label>
                        <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
                          value={conn.type} onChange={e => updateConnection(conn.id, 'type', e.target.value)}>
                          {Object.entries(CONNECTION_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">接続の根拠</label>
                        <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
                          value={conn.basis} onChange={e => updateConnection(conn.id, 'basis', e.target.value)}>
                          {Object.entries(CONNECTION_BASIS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">タイトル</label>
                        <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-bold"
                          value={conn.title || ''} onChange={e => updateConnection(conn.id, 'title', e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">なぜこの資料とつながるか (Connection)</label>
                        <textarea className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm min-h-[60px]"
                          value={conn.connection || ''} onChange={e => updateConnection(conn.id, 'connection', e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-purple-600 uppercase">さらに考えたい問い (Question)</label>
                        <textarea className="mt-1 block w-full rounded-md border border-purple-200 bg-purple-50/30 px-3 py-1.5 text-sm min-h-[60px]"
                          value={conn.question || ''} onChange={e => updateConnection(conn.id, 'question', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">入口となる人物・概念・文献 (カンマ区切り)</label>
                        <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          value={(conn.starting_points || []).join(', ')} onChange={e => handleConnectionArray(conn.id, 'starting_points', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">検索キーワード (カンマ区切り)</label>
                        <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          value={(conn.search_keywords || []).join(', ')} onChange={e => handleConnectionArray(conn.id, 'search_keywords', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {doc.connections?.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                  つながりがまだ登録されていません
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
