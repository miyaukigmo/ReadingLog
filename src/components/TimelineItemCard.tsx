import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Tag, BookOpen, EyeOff } from 'lucide-react';
import type { TimelineEntry } from '@/types/timeline';
import { TIMELINE_EVENT_TYPE_LABELS, getLabel } from '@/lib/constants';

interface TimelineItemCardProps {
  item: TimelineEntry;
  documentTitle?: string;
  documentId?: string;
  onVerifySource?: (id: string, current: string) => void;
  onVerifyExternal?: (id: string, current: string) => void;
  onToggleHide?: () => void;
  isHidden?: boolean;
}

export function TimelineItemCard({ item, documentTitle, documentId, onVerifySource, onVerifyExternal, onToggleHide, isHidden }: TimelineItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      {/* 表面（一覧用） */}
      <div className="p-4 sm:px-5 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-lg font-black text-gray-900 tracking-tight">{item.dateLabel}</span>
            {item.periodLabels.length > 0 && (
              <div className="flex gap-1">
                {item.periodLabels.map((lbl, i) => (
                  <span key={i} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                    {lbl}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${item.importance === 'major' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
            {item.importance === 'major' ? '主要' : '補助'}
          </span>
        </div>
        
        <div>
          {documentTitle && documentId && (
            <Link to={`/document/${documentId}?tab=timeline`} className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-blue-600 hover:underline mb-1 transition-colors">
              <BookOpen className="h-3 w-3" />
              {documentTitle}
            </Link>
          )}
          <h4 className="text-base font-bold text-gray-900 mb-1">{item.title}</h4>
          {item.displaySummary && expanded && (
            <p className="text-sm text-gray-800 mb-2">{item.displaySummary}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            {getLabel(TIMELINE_EVENT_TYPE_LABELS, item.eventType)}
          </span>
          {item.regions.length > 0 && (
            <span className="inline-flex items-center text-[11px] font-medium text-gray-500 gap-1">
              <MapPin className="h-3 w-3" />
              {item.regions.join(', ')}
            </span>
          )}
          {item.fields.length > 0 && (
            <span className="inline-flex items-center text-[11px] font-medium text-gray-500 gap-1">
              <Tag className="h-3 w-3" />
              {item.fields.join(', ')}
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <div>
            {onToggleHide && (
              <button
                onClick={onToggleHide}
                className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  isHidden 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600'
                }`}
                title={isHidden ? "一覧に再表示する" : "一覧から非表示にする"}
              >
                <EyeOff className="h-3 w-3" />
                {isHidden ? '再表示' : '非表示'}
              </button>
            )}
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            {expanded ? (
              <>閉じる <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>詳しく見る <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>

      {/* 裏面（詳細用） */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl space-y-6">
          
          {item.sourceSummary && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-gray-900 border-l-2 border-gray-400 pl-2">本書での扱い</h5>
                {item.id && onVerifySource && (
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-600">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" 
                      checked={item.sourceVerificationStatus === 'verified'}
                      onChange={() => onVerifySource(item.id!, item.sourceVerificationStatus)}
                    />
                    確認済み
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.sourceSummary}</p>
              
              {item.sourceLocations.length > 0 && (
                <div className="mt-2 text-[11px] text-gray-500 flex gap-2">
                  <span className="font-bold">登場箇所:</span>
                  <span>{item.sourceLocations.join(', ')}</span>
                </div>
              )}
              {item.sourceDateExpressions.length > 0 && (
                <div className="mt-1 text-[11px] text-gray-500 flex gap-2">
                  <span className="font-bold">年代表現:</span>
                  <span>{item.sourceDateExpressions.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {item.externalContext && (
            <div>
               <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-blue-900 border-l-2 border-blue-400 pl-2">外部情報による補足</h5>
                {item.id && onVerifyExternal && (
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-blue-800">
                    <input 
                      type="checkbox" 
                      className="rounded border-blue-300 text-blue-900 focus:ring-blue-900" 
                      checked={item.externalVerificationStatus === 'verified'}
                      onChange={() => onVerifyExternal(item.id!, item.externalVerificationStatus)}
                    />
                    確認済み
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.externalContext}</p>
            </div>
          )}

          {item.dateNote && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <h5 className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider mb-1">年代についての注意</h5>
              <p className="text-xs text-yellow-900">{item.dateNote}</p>
            </div>
          )}

          {item.selectionReason && (
            <div>
              <h5 className="text-[11px] font-bold text-gray-400 mb-1">選定理由</h5>
              <p className="text-xs text-gray-600 leading-relaxed">{item.selectionReason}</p>
            </div>
          )}

          {item.externalSources.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">外部出典</h5>
              <ul className="space-y-2">
                {item.externalSources.map((source, i) => (
                  <li key={i} className="text-sm text-gray-700 flex flex-col gap-0.5">
                    <div className="font-bold">{source.title}</div>
                    {source.publisher && <div className="text-xs text-gray-500">{source.publisher}</div>}
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> リンクを開く
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
