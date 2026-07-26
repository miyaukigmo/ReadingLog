import { useState } from 'react';
import { Link as LinkIcon, Split } from 'lucide-react';
import type { PersonEntry } from '@/types/people';
import { PeopleItemCard } from './PeopleItemCard';

export type GlobalPersonEntry = PersonEntry & {
  documentId?: string;
  documentTitle?: string;
  createdAt?: string;
};

export type MergedPersonEntry = {
  id: string; // merge_group_id or item id
  isMerged: boolean;
  primary: GlobalPersonEntry;
  items: GlobalPersonEntry[];
};

interface MergedPeopleCardProps {
  mergedItem: MergedPersonEntry;
  isMergeMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUnmerge?: (id: string) => void;
  onVerifySource?: (id: string, current: string) => Promise<void>;
  onVerifyExternal?: (id: string, current: string) => Promise<void>;
}

export function MergedPeopleCard({ 
  mergedItem, 
  isMergeMode, 
  isSelected, 
  onToggleSelect,
  onUnmerge,
  onVerifySource, 
  onVerifyExternal 
}: MergedPeopleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>(mergedItem.primary.id!);

  // MergeMode時の見た目
  if (isMergeMode) {
    return (
      <div 
        className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => onToggleSelect(mergedItem.id)}
      >
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isSelected}
            readOnly
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 pointer-events-none"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{mergedItem.primary.name}</span>
              {mergedItem.isMerged && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  {mergedItem.items.length}件統合済み
                </span>
              )}
            </div>
            {mergedItem.primary.display_summary && (
              <p className="text-xs text-gray-500 line-clamp-1 mt-1">{mergedItem.primary.display_summary}</p>
            )}
            <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1">
              {mergedItem.items.map(item => (
                <span key={item.id} className="bg-white px-1.5 py-0.5 border border-gray-200 rounded">
                  {item.documentTitle}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 単独アイテムの場合
  if (!mergedItem.isMerged && mergedItem.items.length === 1) {
    return (
      <PeopleItemCard 
        item={mergedItem.primary} 
        documentTitle={mergedItem.primary.documentTitle}
        documentId={mergedItem.primary.documentId}
        onVerifySource={onVerifySource}
        onVerifyExternal={onVerifyExternal}
      />
    );
  }

  // 統合されている場合の見た目
  const activeItem = mergedItem.items.find(i => i.id === activeTabId) || mergedItem.primary;

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      {/* 表面（一覧用） */}
      <div className="relative">
        <PeopleItemCard 
          item={mergedItem.primary} 
          documentTitle={mergedItem.primary.documentTitle}
          documentId={mergedItem.primary.documentId}
          onVerifySource={onVerifySource}
          onVerifyExternal={onVerifyExternal}
          hideDetails={!expanded}
          forceExpanded={expanded}
          onToggleExpand={() => setExpanded(!expanded)}
          badge={
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
              <LinkIcon className="h-3 w-3" />
              {mergedItem.items.length}冊の資料に登場
            </span>
          }
        />
      </div>

      {/* 裏面（展開時の各書籍情報） */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-gray-200 bg-gray-50/80 rounded-b-xl">
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Split className="h-4 w-4 text-blue-600" />
                各資料での扱い
              </h4>
              
              {onUnmerge && (
                <button
                  onClick={() => onUnmerge(mergedItem.id)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  統合を解除する
                </button>
              )}
            </div>

            {/* 資料切り替えタブ */}
            <div className="flex flex-wrap gap-2">
              {mergedItem.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTabId(item.id!)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
                    activeTabId === item.id 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {item.documentTitle}
                </button>
              ))}
            </div>

            {/* アクティブな資料の詳細情報 */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <a 
                  href={`/document/${activeItem.documentId}?tab=people`}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  {activeItem.documentTitle}
                </a>
              </div>
              
              <div className="space-y-4">
                {activeItem.source_summary && (
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-500 mb-1">本書での扱い</h5>
                    <p className="text-sm text-gray-800 leading-relaxed">{activeItem.source_summary}</p>
                  </div>
                )}
                {activeItem.role_in_document && (
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-500 mb-1">本書での役割</h5>
                    <p className="text-sm text-gray-800 leading-relaxed">{activeItem.role_in_document}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
