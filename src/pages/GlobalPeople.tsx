import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PersonEntry } from '@/types/people';
import { PeopleItemCard } from '@/components/PeopleItemCard';
import { PERSON_TYPE_LABELS, ENTITY_KIND_LABELS, FIELDS } from '@/lib/constants';

type GlobalPersonEntry = PersonEntry & {
  documentId?: string;
  documentTitle?: string;
};

export default function GlobalPeople() {
  const [entries, setEntries] = useState<GlobalPersonEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルタリング状態
  const [searchQuery, setSearchQuery] = useState('');
  const [importanceFilter, setImportanceFilter] = useState<'all' | 'major' | 'supporting'>('all');
  const [entityKindFilter, setEntityKindFilter] = useState<string>('all');
  const [personTypeFilter, setPersonTypeFilter] = useState<string>('all');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  
  // 表示モード
  const [viewMode, setViewMode] = useState<'continuous' | 'century' | 'region' | 'type' | 'field'>('continuous');

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('person_entries')
        .select('*, documents(id, title)');

      if (fetchError) throw fetchError;

      const mappedData: GlobalPersonEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        source_name_expressions: entry.source_name_expressions || [],
        original_name: entry.original_name || "",
        entity_kind: entry.entity_kind,
        person_type: entry.person_type,
        fields: entry.fields || [],
        importance: entry.importance,
        mention_types: entry.mention_types || [],
        display_summary: entry.display_summary || "",
        source_summary: entry.source_summary || "",
        role_in_document: entry.role_in_document || "",
        key_ideas_or_actions: entry.key_ideas_or_actions || [],
        source_works: entry.source_works || [],
        external_profile: entry.external_profile || "",
        life_span_label: entry.life_span_label || "",
        birth_year: entry.birth_year,
        death_year: entry.death_year,
        life_date_certainty: entry.life_date_certainty,
        activity_regions: entry.activity_regions || [],
        external_key_works: entry.external_key_works || [],
        source_locations: entry.source_locations || [],
        selection_reason: entry.selection_reason || "",
        identity_note: entry.identity_note || "",
        external_sources: entry.external_sources || [],
        processing_status: entry.processing_status || "ai_processed",
        source_verification_status: entry.source_verification_status || "unverified",
        external_verification_status: entry.external_verification_status || "unverified",
        // Joinされたdocuments情報
        documentId: entry.documents?.id,
        documentTitle: entry.documents?.title
      }));

      // 基本は名前順ソート
      const collator = new Intl.Collator('ja');
      mappedData.sort((a, b) => collator.compare(a.name, b.name));

      setEntries(mappedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'データ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySource = async (id: string, current: string) => {
    const newVal = current === 'verified' ? 'unverified' : 'verified';
    await supabase.from('person_entries').update({ source_verification_status: newVal }).eq('id', id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, sourceVerificationStatus: newVal as any } : e));
  };

  const handleVerifyExternal = async (id: string, current: string) => {
    const newVal = current === 'verified' ? 'unverified' : 'verified';
    await supabase.from('person_entries').update({ external_verification_status: newVal }).eq('id', id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, externalVerificationStatus: newVal as any } : e));
  };

  // フィルタリング処理
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // 検索
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = (s?: string | null) => s?.toLowerCase().includes(q) ?? false;
        const matchesArray = (arr?: string[]) => arr?.some(s => s.toLowerCase().includes(q)) ?? false;
        
        if (!matches(entry.name) && 
            !matches(entry.original_name) && 
            !matches(entry.display_summary) && 
            !matches(entry.role_in_document) && 
            !matchesArray(entry.source_name_expressions) &&
            !matches(entry.documentTitle)) {
          return false;
        }
      }
      
      // フィルター
      if (importanceFilter !== 'all' && entry.importance !== importanceFilter) return false;
      if (entityKindFilter !== 'all' && entry.entity_kind !== entityKindFilter) return false;
      if (personTypeFilter !== 'all' && entry.person_type !== personTypeFilter) return false;
      if (fieldFilter !== 'all' && !(entry.fields || []).includes(fieldFilter as any)) return false;
      
      return true;
    });
  }, [entries, searchQuery, importanceFilter, entityKindFilter, personTypeFilter, fieldFilter]);

  // グループ化処理
  const groupedEntries = useMemo(() => {
    if (viewMode === 'continuous') return null;
    
    type Group = { label: string; sortValue: number; items: GlobalPersonEntry[] };
    const groupMap = new Map<string, Group>();

    const getOrCreateGroup = (label: string, sortValue: number) => {
      if (!groupMap.has(label)) {
        groupMap.set(label, { label, sortValue, items: [] });
      }
      return groupMap.get(label)!;
    };

    filteredEntries.forEach(entry => {
      if (viewMode === 'century') {
        let centuryLabel = "時代不明";
        let sortValue = 9999;
        const year = entry.birth_year !== null ? entry.birth_year : entry.death_year;
        
        if (year !== null) {
          if (year < 0) {
            const c = Math.floor((Math.abs(year) - 1) / 100) + 1;
            centuryLabel = `紀元前${c}世紀`;
            sortValue = -c; // 古い方が先
          } else {
            const c = Math.floor((year - 1) / 100) + 1;
            centuryLabel = `${c}世紀`;
            sortValue = c;
          }
        }
        getOrCreateGroup(centuryLabel, sortValue).items.push(entry);
      } 
      else if (viewMode === 'region') {
        const regions = entry.activity_regions && entry.activity_regions.length > 0 ? entry.activity_regions : ['地域不明'];
        regions.forEach((region: string) => {
          getOrCreateGroup(region, region === '地域不明' ? 9999 : 0).items.push(entry);
        });
      }
      else if (viewMode === 'type') {
        const typeLabel = PERSON_TYPE_LABELS[entry.person_type as keyof typeof PERSON_TYPE_LABELS] || 'その他';
        getOrCreateGroup(typeLabel, typeLabel === 'その他' ? 9999 : 0).items.push(entry);
      }
      else if (viewMode === 'field') {
        const fields = entry.fields && entry.fields.length > 0 ? entry.fields : ['分野不明'];
        fields.forEach(field => {
          getOrCreateGroup(field, field === '分野不明' ? 9999 : 0).items.push(entry);
        });
      }
    });
    
    const groups = Array.from(groupMap.values());
    
    // グループのソート
    groups.sort((a, b) => {
      if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
      return a.label.localeCompare(b.label, 'ja');
    });
    
    return groups;
  }, [filteredEntries, viewMode]);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-in fade-in pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gray-100 p-3 rounded-full">
          <Users className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">全体人物一覧</h1>
          <p className="text-sm text-gray-500">すべての資料の人物情報を統合した一覧です</p>
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
        <div className="flex flex-col xl:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="人物名、原語名、資料名、概要などで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-1 xl:self-end shrink-0 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {[
              { id: 'continuous', label: '一覧' },
              { id: 'century', label: '時代別' },
              { id: 'region', label: '地域別' },
              { id: 'type', label: 'タイプ別' },
              { id: 'field', label: '分野別' },
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                  viewMode === mode.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode.label}
              </button>
            ))}
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
            <option value="major">主要な人物のみ</option>
            <option value="supporting">補助人物のみ</option>
          </select>

          <select 
            value={entityKindFilter} 
            onChange={e => setEntityKindFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">すべて（区分）</option>
            {Object.entries(ENTITY_KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select 
            value={personTypeFilter} 
            onChange={e => setPersonTypeFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">すべて（タイプ）</option>
            {Object.entries(PERSON_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
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
          <p className="text-sm font-medium">データを読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900 mb-1">人物データがありません</h3>
              <p className="text-xs text-gray-500">
                各資料の人物タブからJSONを取り込むと、ここに統合された一覧が表示されます。
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'continuous' && (
                <div className="grid grid-cols-1 gap-4">
                  {filteredEntries.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      条件に一致する人物が見つかりませんでした。
                    </div>
                  )}
                  {filteredEntries.map((item, idx) => (
                    <PeopleItemCard 
                      key={item.id || idx} 
                      item={item} 
                      documentTitle={item.documentTitle}
                      documentId={item.documentId}
                      onVerifySource={handleVerifySource}
                      onVerifyExternal={handleVerifyExternal}
                    />
                  ))}
                </div>
              )}

              {viewMode !== 'continuous' && (
                <div className="space-y-12">
                  {groupedEntries?.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      条件に一致する人物が見つかりませんでした。
                    </div>
                  )}
                  {groupedEntries?.map(group => (
                    <div key={group.label} className="relative">
                      {/* 見出し */}
                      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 mb-4 border-b border-gray-200">
                        <div className="flex items-baseline gap-3">
                          <h2 className="text-xl font-black text-gray-900 tracking-tight">{group.label}</h2>
                          <span className="text-xs font-bold text-gray-400">{group.items.length}件</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {group.items.map((item, idx) => (
                          <PeopleItemCard 
                            key={`${group.label}-${item.id || idx}`} 
                            item={item} 
                            documentTitle={item.documentTitle}
                            documentId={item.documentId}
                            onVerifySource={handleVerifySource}
                            onVerifyExternal={handleVerifyExternal}
                          />
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
