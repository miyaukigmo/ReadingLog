import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { importSchema } from '@/types/schema';
import type { ImportData, ImportDataV11 } from '@/types/schema';
import { Upload, FileJson, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';

export default function Import() {
  const [jsonText, setJsonText] = useState('');
  const [previewData, setPreviewData] = useState<ImportDataV11 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(e.target.value);
    setError(null);
    setPreviewData(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      setError(null);
      setPreviewData(null);
    };
    reader.onerror = () => {
      setError('ファイルの読み込みに失敗しました');
    };
    reader.readAsText(file);
    // 選択状態をリセット
    e.target.value = '';
  };

  const handlePreview = () => {
    setError(null);
    setPreviewData(null);
    try {
      if (!jsonText.trim()) {
        throw new Error('JSONを入力するか、ファイルを選択してください');
      }
      const parsed = JSON.parse(jsonText);
      const result = importSchema.safeParse(parsed);
      
      if (!result.success) {
        // Zodのエラーメッセージを見やすくフォーマット
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new Error(`データの形式が正しくありません: ${issues}`);
      }

      // V1.0 の場合は V1.1 へ正規化する
      let normalizedData: ImportDataV11;
      
      if (result.data.schemaVersion === '1.0') {
        const v1Doc = result.data.document;
        normalizedData = {
          schemaVersion: '1.1',
          document: {
            purpose: 'study',
            type: v1Doc.type,
            title: v1Doc.title,
            authors: v1Doc.authors,
            categories: v1Doc.categories,
            summary: v1Doc.summary,
            notebookLmReport: v1Doc.notebookLmReport,
            keyPoints: v1Doc.keyPoints,
            sections: v1Doc.sections.map(sec => ({
              title: sec.title,
              summary: sec.summary,
              archiveReport: '',
              originalText: '',
              keywords: [],
              items: sec.items
            })),
            connections: []
          }
        };
      } else {
        // V1.1
        normalizedData = result.data as ImportDataV11;
      }

      setPreviewData(normalizedData);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('有効なJSONではありません');
      } else {
        setError(err.message || '予期せぬエラーが発生しました');
      }
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    setIsImporting(true);
    setError(null);

    let newDocId: string | null = null;
    
    try {
      // 1. Documents 登録
      const { data: docData, error: docError } = await supabase.from('documents').insert({
        purpose: previewData.document.purpose,
        type: previewData.document.type,
        title: previewData.document.title,
        authors: previewData.document.authors,
        categories: previewData.document.categories,
        summary: previewData.document.summary,
        notebook_lm_report: previewData.document.notebookLmReport,
        key_points: previewData.document.keyPoints,
      }).select('id').single();

      if (docError) throw docError;
      newDocId = docData.id;

      // 2. Sections 登録
      const sectionsCount = previewData.document.sections.length;
      if (sectionsCount > 0) {
        const sectionsToInsert = previewData.document.sections.map((sec, idx) => ({
          document_id: docData.id,
          title: sec.title,
          summary: sec.summary,
          original_text: sec.originalText,
          archive_report: sec.archiveReport,
          keywords: sec.keywords,
          sort_order: idx
        }));

        const { data: secData, error: secError } = await supabase.from('sections').insert(sectionsToInsert).select('id, sort_order');
        if (secError) throw secError;

        // 3. Items 登録
        const itemsToInsert: any[] = [];
        previewData.document.sections.forEach((sec, sIdx) => {
          const sectionId = secData.find(s => s.sort_order === sIdx)?.id;
          if (!sectionId) return;

          sec.items.forEach((item, iIdx) => {
            itemsToInsert.push({
              section_id: sectionId,
              title: item.title,
              summary: item.summary,
              detail: item.detail,
              review_prompt: item.reviewPrompt,
              review_enabled: item.reviewEnabled,
              keywords: item.keywords,
              sort_order: iIdx,
              verification_status: 'unverified'
            });
          });
        });

        if (itemsToInsert.length > 0) {
          const { error: itemError } = await supabase.from('items').insert(itemsToInsert);
          if (itemError) throw itemError;
        }
      }

      // 4. Connections 登録
      const connectionsCount = previewData.document.connections?.length || 0;
      if (connectionsCount > 0) {
        const connsToInsert = previewData.document.connections.map((conn, idx) => ({
          document_id: docData.id,
          type: conn.type,
          title: conn.title,
          connection: conn.connection,
          question: conn.question,
          starting_points: conn.startingPoints,
          search_keywords: conn.searchKeywords,
          basis: conn.basis,
          sort_order: idx
        }));
        
        const { error: connError } = await supabase.from('connections').insert(connsToInsert);
        if (connError) throw connError;
      }

      // 成功時
      navigate('/');

    } catch (err: any) {
      console.error('Import error:', err);
      // ロールバック (クリーンアップ)
      if (newDocId) {
        await supabase.from('documents').delete().eq('id', newDocId);
      }
      setError(`インポートに失敗しました: ${err.message || '予期せぬエラー'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // プレビュー時の集計
  let sectionCount = 0;
  let itemCount = 0;
  let reviewEnabledCount = 0;
  let connectionCount = 0;
  
  if (previewData) {
    sectionCount = previewData.document.sections.length;
    previewData.document.sections.forEach(sec => {
      itemCount += sec.items.length;
      sec.items.forEach(item => {
        if (item.reviewEnabled) reviewEnabledCount++;
      });
    });
    connectionCount = previewData.document.connections?.length || 0;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">資料のインポート</h1>
        </div>
      </header>
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-md bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="whitespace-pre-wrap break-words">{error}</div>
          </div>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSONデータを貼り付け
            </label>
            <textarea
              className="w-full h-64 rounded-md border border-gray-300 p-3 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder='{"schemaVersion": "1.1", "document": { ... }}'
              value={jsonText}
              onChange={handleTextChange}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-sm text-gray-500">または</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <div>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 hover:bg-gray-50">
              <FileJson className="h-6 w-6 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">.json ファイルを選択</span>
              <input type="file" accept=".json" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handlePreview}
              disabled={!jsonText.trim() || isImporting}
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
            >
              内容を確認
            </button>
          </div>
        </div>

        {previewData && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-green-600 border-b border-gray-100 pb-4">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-gray-900">プレビュー</h2>
            </div>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">資料タイトル</dt>
                <dd className="mt-1 text-base text-gray-900">{previewData.document.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">著者</dt>
                <dd className="mt-1 text-sm text-gray-900">{previewData.document.authors.join(', ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">用途 (Purpose)</dt>
                <dd className="mt-1 text-sm font-semibold text-blue-600 capitalize">{previewData.document.purpose}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">タイプ</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{previewData.document.type}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">カテゴリー</dt>
                <dd className="mt-1 text-sm text-gray-900 flex flex-wrap gap-1">
                  {previewData.document.categories.length > 0 ? (
                    previewData.document.categories.map((c, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {c}
                      </span>
                    ))
                  ) : '-'}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-4 gap-4 border-t border-gray-100 pt-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-xl font-semibold text-gray-900">{sectionCount}</div>
                <div className="text-xs font-medium text-gray-500 mt-1">セクション</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-xl font-semibold text-gray-900">{itemCount}</div>
                <div className="text-xs font-medium text-gray-500 mt-1">項目数</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-xl font-semibold text-gray-900">{connectionCount}</div>
                <div className="text-xs font-medium text-gray-500 mt-1">コネクション</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-xl font-semibold text-blue-700">{reviewEnabledCount}</div>
                <div className="text-xs font-medium text-blue-600 mt-1">復習対象</div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={() => setPreviewData(null)}
                disabled={isImporting}
                className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Upload className="h-4 w-4 animate-bounce" />
                    登録中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    この資料を登録する
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
