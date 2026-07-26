import { useState, useEffect, useMemo } from 'react';
import { Clock, Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { TimelineEntry } from '@/types/timeline';
import { TimelineItemCard } from '@/components/TimelineItemCard';
import { TIMELINE_EVENT_TYPE_LABELS, REGIONS, FIELDS } from '@/lib/constants';

type GlobalTimelineEntry = TimelineEntry & {
  documentId?: string;
  documentTitle?: string;
};

export default function GlobalTimeline() {
  const [entries, setEntries] = useState<GlobalTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルタリング状態
  const [searchQuery, setSearchQuery] = useState('');
  const [importanceFilter, setImportanceFilter] = useState<'all' | 'major' | 'supporting'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  
  // 表示モード
  const [viewMode, setViewMode] = useState<'continuous' | 'century'>('continuous');

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('timeline_entries')
        .select('*, documents(id, title)')
        .order('sort_year', { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;

      const mappedData: GlobalTimelineEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        dateLabel: entry.date_label,
        sourceDateExpressions: entry.source_date_expressions || [],
        startYear: entry.start_year,
        startMonth: entry.start_month,
        startDay: entry.start_day,
        endYear: entry.end_year,
        endMonth: entry.end_month,
        endDay: entry.end_day,
        sortYear: entry.sort_year,
        precision: entry.precision,
        dateSource: entry.date_source,
        dateCertainty: entry.date_certainty,
        periodLabels: entry.period_labels || [],
        title: entry.title,
        eventType: entry.event_type,
        importance: entry.importance,
        displaySummary: entry.display_summary || "",
        sourceSummary: entry.source_summary || "",
        externalContext: entry.external_context || "",
        selectionReason: entry.selection_reason || "",
        sourceLocations: entry.source_locations || [],
        regions: entry.regions || [],
        fields: entry.fields || [],
        externalSources: entry.external_sources || [],
        dateNote: entry.date_note || "",
        processingStatus: entry.processing_status || "ai_processed",
        sourceVerificationStatus: entry.source_verification_status || "unverified",
        externalVerificationStatus: entry.external_verification_status || "unverified",
        // Joinされたdocuments情報
        documentId: entry.documents?.id,
        documentTitle: entry.documents?.title
      }));

      setEntries(mappedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'データ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // フィルタリング処理
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // 検索
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = (s?: string) => s?.toLowerCase().includes(q) ?? false;
        const matchesArray = (arr?: string[]) => arr?.some(s => s.toLowerCase().includes(q)) ?? false;
        
        if (!matches(entry.title) && 
            !matches(entry.displaySummary) && 
            !matches(entry.dateLabel) && 
            !matchesArray(entry.periodLabels) &&
            !matches(entry.documentTitle)) {
          return false;
        }
      }
      
      // フィルター
      if (importanceFilter !== 'all' && entry.importance !== importanceFilter) return false;
      if (eventTypeFilter !== 'all' && entry.eventType !== eventTypeFilter) return false;
      if (regionFilter !== 'all' && !(entry.regions || []).includes(regionFilter as any)) return false;
      if (fieldFilter !== 'all' && !(entry.fields || []).includes(fieldFilter as any)) return false;
      
      return true;
    });
  }, [entries, searchQuery, importanceFilter, eventTypeFilter, regionFilter, fieldFilter]);

  // 世紀別グループ化
  const groupedEntries = useMemo(() => {
    if (viewMode !== 'century') return null;
    
    const groups: { century: string; sortValue: number; items: GlobalTimelineEntry[] }[] = [];
    
    filteredEntries.forEach(entry => {
      let centuryLabel = "年代不明";
      let sortValue = 9999;
      
      if (entry.sortYear !== null) {
        if (entry.sortYear < 0) {
          const c = Math.floor((Math.abs(entry.sortYear) - 1) / 100) + 1;
          centuryLabel = `紀元前${c}世紀`;
          sortValue = -c; // 古い方が先になるように
        } else {
          const c = Math.floor((entry.sortYear - 1) / 100) + 1;
          centuryLabel = `${c}世紀`;
          sortValue = c;
        }
      }
      
      let group = groups.find(g => g.century === centuryLabel);
      if (!group) {
        group = { century: centuryLabel, sortValue, items: [] };
        groups.push(group);
      }
      group.items.push(entry);
    });
    
    // グループ自体のソート
    groups.sort((a, b) => a.sortValue - b.sortValue);
    
    return groups;
  }, [filteredEntries, viewMode]);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-in fade-in pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gray-100 p-3 rounded-full">
          <Clock className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">全体年表</h1>
          <p className="text-sm text-gray-500">すべての資料の年代情報を統合した年表です</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ツールバー */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 space-y-4">
        {/* 上段：検索と表示モード切り替え */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="出来事、人物、時代、資料名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
            />
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'continuous' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              連続表示
            </button>
            <button
              onClick={() => setViewMode('century')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'century' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              世紀別表示
            </button>
          </div>
        </div>

        {/* 下段：フィルター */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <Filter className="h-4 w-4 text-gray-400 mr-1" />
          
          <select 
            value={importanceFilter} 
            onChange={e => setImportanceFilter(e.target.value as any)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">すべて（重要度）</option>
            <option value="major">主要な出来事のみ</option>
            <option value="supporting">補助的な出来事のみ</option>
          </select>

          <select 
            value={eventTypeFilter} 
            onChange={e => setEventTypeFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">すべて（種類）</option>
            {Object.entries(TIMELINE_EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select 
            value={regionFilter} 
            onChange={e => setRegionFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">すべて（地域）</option>
            {REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select 
            value={fieldFilter} 
            onChange={e => setFieldFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">すべて（分野）</option>
            {FIELDS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <div className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {filteredEntries.length} 件
          </div>
        </div>
      </div>

      {/* メインリスト表示エリア */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm font-medium">年表データを読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900 mb-1">年代データがありません</h3>
              <p className="text-xs text-gray-500">
                各資料の年代タブからJSONを取り込むと、ここに統合された年表が表示されます。
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'continuous' && (
                <div className="space-y-4">
                  {filteredEntries.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      条件に一致する出来事が見つかりませんでした。
                    </div>
                  )}
                  {filteredEntries.map((item, idx) => (
                    <TimelineItemCard 
                      key={item.id || idx} 
                      item={item} 
                      documentTitle={item.documentTitle}
                      documentId={item.documentId}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'century' && (
                <div className="space-y-12">
                  {groupedEntries?.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      条件に一致する出来事が見つかりませんでした。
                    </div>
                  )}
                  {groupedEntries?.map(group => (
                    <div key={group.century} className="relative">
                      {/* 世紀見出しとタイムラインの線 */}
                      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 mb-4 border-b border-gray-200">
                        <div className="flex items-baseline gap-3">
                          <h2 className="text-xl font-black text-gray-900 tracking-tight">{group.century}</h2>
                          <span className="text-xs font-bold text-gray-400">{group.items.length}件</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pl-2 sm:pl-4 border-l-2 border-gray-200/60 ml-2 sm:ml-4">
                        {group.items.map((item, idx) => (
                          <div key={item.id || idx} className="relative">
                            {/* タイムラインのドット */}
                            <div className="absolute -left-[23px] sm:-left-[31px] top-6 h-3 w-3 rounded-full bg-white border-2 border-gray-300 shadow-sm z-0"></div>
                            <TimelineItemCard 
                              item={item} 
                              documentTitle={item.documentTitle}
                              documentId={item.documentId}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
