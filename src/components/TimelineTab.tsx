import { useState, useMemo } from 'react';
import { Upload, AlertTriangle, FileJson, Check, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { timelineImportSchema } from '@/types/timeline';
import type { TimelineEntry, TimelineImportData } from '@/types/timeline';
import { TimelineItemCard } from './TimelineItemCard';
import { TIMELINE_EVENT_TYPE_LABELS, REGIONS, FIELDS } from '@/lib/constants';

interface TimelineTabProps {
  documentId: string;
  documentTitle: string;
  entries: TimelineEntry[];
  onRefresh: () => void;
}

export function TimelineTab({ documentId, documentTitle, entries, onRefresh }: TimelineTabProps) {
  const [showSupporting, setShowSupporting] = useState(false);
  const [viewMode, setViewMode] = useState<'continuous' | 'century'>('continuous');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterField, setFilterField] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // インポート関連
  const [isImporting, setIsImporting] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<TimelineImportData | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (!showSupporting && e.importance !== 'major') return false;
      if (filterEventType !== 'all' && e.eventType !== filterEventType) return false;
      if (filterRegion !== 'all' && !e.regions.includes(filterRegion)) return false;
      if (filterField !== 'all' && !e.fields.includes(filterField)) return false;
      return true;
    });
  }, [entries, showSupporting, filterEventType, filterRegion, filterField]);

  // 世紀の計算ヘルパー
  const getCenturyString = (year: number | null): string => {
    if (year === null || year === 0) return '年代未確定';
    if (year > 0) {
      return `${Math.ceil(year / 100)}世紀`;
    } else {
      return `紀元前${Math.ceil(Math.abs(year) / 100)}世紀`;
    }
  };

  const groupedEntries = useMemo(() => {
    if (viewMode !== 'century') return null;
    
    const groups: { [key: string]: TimelineEntry[] } = {};
    filteredEntries.forEach(entry => {
      const c = getCenturyString(entry.sortYear);
      if (!groups[c]) groups[c] = [];
      groups[c].push(entry);
    });

    // 世紀のソート順（古い順）
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '年代未確定') return 1;
      if (b === '年代未確定') return -1;
      
      const getVal = (str: string) => {
        if (str.startsWith('紀元前')) {
          return -parseInt(str.replace('紀元前', '').replace('世紀', ''));
        }
        return parseInt(str.replace('世紀', ''));
      };
      return getVal(a) - getVal(b);
    });

    return sortedKeys.map(k => ({ century: k, items: groups[k] }));
  }, [filteredEntries, viewMode]);

  const handleVerifySource = async (id: string, current: string) => {
    const newVal = current === 'verified' ? 'unverified' : 'verified';
    await supabase.from('timeline_entries').update({ source_verification_status: newVal }).eq('id', id);
    onRefresh();
  };

  const handleVerifyExternal = async (id: string, current: string) => {
    const newVal = current === 'verified' ? 'unverified' : 'verified';
    await supabase.from('timeline_entries').update({ external_verification_status: newVal }).eq('id', id);
    onRefresh();
  };

  // インポート処理
  const handleJsonChange = (val: string) => {
    setImportJson(val);
    setImportError(null);
    setPreviewData(null);
    if (!val.trim()) return;

    try {
      const parsed = JSON.parse(val);
      const result = timelineImportSchema.safeParse(parsed);
      if (result.success) {
        setPreviewData(result.data);
      } else {
        const errorMessages = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('\n');
        setImportError(`JSONの形式が正しくありません。\n${errorMessages}`);
      }
    } catch (e) {
      setImportError('JSONとして解析できませんでした。');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      handleJsonChange(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeImport = async () => {
    if (!previewData) return;
    setIsImporting(true);
    setImportError(null);
    try {
      // RPCを呼び出してアトミックに置き換え
      const { error } = await supabase.rpc('replace_document_timeline', {
        p_document_id: documentId,
        p_entries: previewData.entries
      });
      if (error) throw error;
      
      setImportJson('');
      setPreviewData(null);
      onRefresh();
    } catch (err: any) {
      setImportError(`インポートに失敗しました: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ツールバー */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showSupporting}
                onChange={(e) => setShowSupporting(e.target.checked)}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" 
              />
              補助項目も表示
            </label>
            <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('continuous')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'continuous' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                連続表示
              </button>
              <button
                onClick={() => setViewMode('century')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'century' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                世紀ごと表示
              </button>
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg flex items-center gap-1"
            >
              <Filter className="h-3 w-3" /> 絞り込み
            </button>
          </div>
          
        </div>

        {/* 絞り込みフィルター (デスクトップで表示、スマホはトグル) */}
        <div className={`mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
          <select 
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="text-xs font-medium border-gray-300 rounded-md shadow-sm focus:border-gray-900 focus:ring-gray-900 py-1.5"
          >
            <option value="all">すべての種類</option>
            {Object.entries(TIMELINE_EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select 
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="text-xs font-medium border-gray-300 rounded-md shadow-sm focus:border-gray-900 focus:ring-gray-900 py-1.5"
          >
            <option value="all">すべての地域</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select 
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="text-xs font-medium border-gray-300 rounded-md shadow-sm focus:border-gray-900 focus:ring-gray-900 py-1.5"
          >
            <option value="all">すべての分野</option>
            {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* コンテンツ一覧 */}
      {entries.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500 font-medium mb-4">この資料には年代索引が登録されていません</p>
        </div>
      ) : (
        <div className="space-y-8">
          {viewMode === 'continuous' ? (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {filteredEntries.map((entry, idx) => (
                <div key={entry.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)]">
                    <TimelineItemCard 
                      item={entry} 
                      onVerifySource={handleVerifySource} 
                      onVerifyExternal={handleVerifyExternal} 
                    />
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="text-center py-10 text-gray-500">条件に一致する項目がありません。</div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {groupedEntries?.map((group) => (
                <div key={group.century}>
                  <h3 className="text-xl font-black text-gray-900 mb-4 sticky top-16 bg-gray-50/90 backdrop-blur py-2 z-10 border-b border-gray-200">
                    {group.century}
                  </h3>
                  <div className="space-y-4">
                    {group.items.map((entry, idx) => (
                      <TimelineItemCard 
                        key={entry.id || idx} 
                        item={entry}
                        onVerifySource={handleVerifySource} 
                        onVerifyExternal={handleVerifyExternal} 
                      />
                    ))}
                  </div>
                </div>
              ))}
              {groupedEntries?.length === 0 && (
                <div className="text-center py-10 text-gray-500">条件に一致する項目がありません。</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* インポートセクション */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 mt-8">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5" /> 年代JSONを取り込む
        </h3>
        {entries.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3 text-red-800 mb-6 border border-red-100">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-bold leading-relaxed">
              この資料に登録されている年代項目をすべて削除し、新しいデータへ置き換えます。<br />
              確認状態を含む既存データは失われます。
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">JSONファイルを選択</label>
            <input 
              type="file" 
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-gray-500">またはテキストを貼り付け</span>
            </div>
          </div>
          <textarea
            value={importJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder='{"schemaVersion": "1.0", "dataType": "timeline", ...}'
            className="w-full h-32 text-xs font-mono p-3 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-gray-900"
          ></textarea>
        </div>

        {importError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium whitespace-pre-wrap border border-red-100">
            {importError}
          </div>
        )}

        {previewData && (
          <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200 font-bold text-sm flex items-center gap-2 text-gray-700">
              <FileJson className="h-4 w-4" /> インポート内容のプレビュー
            </div>
            <div className="p-4 bg-white space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">JSON内の資料タイトル</div>
                  <div className={`text-sm font-bold ${previewData.sourceDocument.title !== documentTitle ? 'text-orange-600' : 'text-gray-900'} line-clamp-2`}>
                    {previewData.sourceDocument.title}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">登録予定件数</div>
                  <div className="text-sm font-bold text-gray-900">{previewData.entries.length} 件</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">主要 / 補助</div>
                  <div className="text-sm font-bold text-gray-900">
                    {previewData.entries.filter(e => e.importance === 'major').length} / {previewData.entries.filter(e => e.importance === 'supporting').length}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">未確定の件数</div>
                  <div className="text-sm font-bold text-gray-900">
                    {previewData.entries.filter(e => e.sortYear === null).length} 件
                  </div>
                </div>
              </div>

              {previewData.sourceDocument.title !== documentTitle && (
                <div className="bg-orange-50 p-3 rounded-lg text-orange-800 text-xs font-bold border border-orange-100 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>JSONの資料タイトルと、現在開いている資料タイトルが異なります。この資料へ取り込んでよいか確認してください。</div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={executeImport}
                  disabled={isImporting}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm shadow hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? '置き換え中...' : <><Check className="h-4 w-4" /> 置き換えを実行</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
