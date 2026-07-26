import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Tag, BookOpen } from 'lucide-react';
import type { PersonEntry } from '@/types/people';
import { 
  PERSON_TYPE_LABELS, 
  ENTITY_KIND_LABELS, 
  MENTION_TYPE_LABELS
} from '@/lib/constants';

export interface PeopleItemCardProps {
  item: PersonEntry;
  documentTitle?: string;
  documentId?: string;
  onVerifySource?: (id: string, current: string) => Promise<void>;
  onVerifyExternal?: (id: string, current: string) => Promise<void>;
}

export function PeopleItemCard({ item, documentTitle, documentId, onVerifySource, onVerifyExternal }: PeopleItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      {/* 表面（一覧用） */}
      <div className="p-4 sm:px-5 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-gray-900 tracking-tight">{item.name}</span>
              {item.original_name && (
                <span className="text-xs font-bold text-gray-500">{item.original_name}</span>
              )}
            </div>
            {item.life_span_label && (
              <div className="text-xs font-bold text-gray-600 flex items-center gap-1">
                {item.life_span_label}
                {item.life_date_certainty !== 'established' && item.life_date_certainty !== 'unknown' && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">
                    {item.life_date_certainty === 'approximate' ? '概算' : item.life_date_certainty === 'disputed' ? '諸説あり' : '文脈依存'}
                  </span>
                )}
                {item.life_date_certainty === 'unknown' && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">不明</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${item.importance === 'major' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
              {item.importance === 'major' ? '主要' : '補助'}
            </span>
            {documentTitle && documentId && (
              <a
                href={`/document/${documentId}?tab=people`}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 px-2 py-0.5 rounded border border-gray-200 hover:border-gray-300"
                title="元の資料を開く"
              >
                <BookOpen className="h-3 w-3" />
                <span className="max-w-[120px] sm:max-w-[160px] truncate">{documentTitle}</span>
              </a>
            )}
          </div>
        </div>
        
        {item.display_summary && (
          <div>
            {!expanded ? (
              <p className="text-sm text-gray-600 line-clamp-2">{item.display_summary}</p>
            ) : (
              <p className="text-sm text-gray-800 mb-2">{item.display_summary}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            {PERSON_TYPE_LABELS[item.person_type] || item.person_type}
          </span>
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
            {ENTITY_KIND_LABELS[item.entity_kind] || item.entity_kind}
          </span>
          {item.fields.length > 0 && (
            <span className="inline-flex items-center text-[11px] font-medium text-gray-500 gap-1">
              <Tag className="h-3 w-3" />
              {item.fields.join(', ')}
            </span>
          )}
        </div>
        
        <div className="flex justify-end mt-1">
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
        <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl space-y-8">
          
          {/* ======================================= */}
          {/* 本書情報ブロック */}
          {/* ======================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                本書での情報
              </h4>
              {item.id && onVerifySource && (
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-600">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" 
                    checked={item.source_verification_status === 'verified'}
                    onChange={() => onVerifySource(item.id!, item.source_verification_status)}
                  />
                  確認済み
                </label>
              )}
            </div>

            {item.source_summary && (
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-1">本書での扱い</h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.source_summary}</p>
              </div>
            )}

            {item.role_in_document && (
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-1">本書での役割</h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.role_in_document}</p>
              </div>
            )}

            {item.key_ideas_or_actions.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-1">本書内で重要な思想・主張・行動・作品</h5>
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {item.key_ideas_or_actions.map((idea, i) => (
                    <li key={i}>{idea}</li>
                  ))}
                </ul>
              </div>
            )}

            {item.source_works.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-1">本書で言及された著作・作品</h5>
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {item.source_works.map((work, i) => (
                    <li key={i}>{work}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
              {item.mention_types.length > 0 && (
                <div className="flex gap-2">
                  <span className="font-bold">登場方法:</span>
                  <div className="flex gap-1 flex-wrap">
                    {item.mention_types.map(m => (
                      <span key={m} className="bg-white border border-gray-200 px-1.5 rounded text-gray-600">
                        {MENTION_TYPE_LABELS[m] || m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.source_locations.length > 0 && (
                <div className="flex gap-2">
                  <span className="font-bold">登場箇所:</span>
                  <span>{item.source_locations.join(', ')}</span>
                </div>
              )}
              {item.source_name_expressions.length > 0 && (
                <div className="flex gap-2">
                  <span className="font-bold">資料内の名前表記:</span>
                  <span>{item.source_name_expressions.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* ======================================= */}
          {/* 外部情報ブロック */}
          {/* ======================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-600" />
                外部情報
              </h4>
              {item.id && onVerifyExternal && (
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-blue-800">
                  <input 
                    type="checkbox" 
                    className="rounded border-blue-300 text-blue-900 focus:ring-blue-900" 
                    checked={item.external_verification_status === 'verified'}
                    onChange={() => onVerifyExternal(item.id!, item.external_verification_status)}
                  />
                  確認済み
                </label>
              )}
            </div>

            {item.external_profile && (
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-1">外部プロフィール</h5>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.external_profile}</p>
              </div>
            )}

            {item.external_key_works.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-500 mb-1">外部情報による代表作</h5>
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {item.external_key_works.map((work, i) => (
                    <li key={i}>
                      {work.title}
                      {work.year !== null && work.year !== 0 && <span className="text-gray-500 ml-1">({work.year}年)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.activity_regions.length > 0 && (
              <div className="text-[11px] text-gray-500 flex gap-2">
                <span className="font-bold">活動地域:</span>
                <span>{item.activity_regions.join(', ')}</span>
              </div>
            )}

            {item.external_sources.length > 0 && (
              <div className="mt-2">
                <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">外部出典</h5>
                <ul className="space-y-2">
                  {item.external_sources.map((source, i) => (
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

          {/* ======================================= */}
          {/* その他注意・補助情報 */}
          {/* ======================================= */}
          {(item.identity_note || item.selection_reason) && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {item.identity_note && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <h5 className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                    人物同定上の注意
                  </h5>
                  <p className="text-xs text-yellow-900 leading-relaxed">{item.identity_note}</p>
                </div>
              )}

              {item.selection_reason && (
                <div>
                  <h5 className="text-[11px] font-bold text-gray-400 mb-1">選定理由</h5>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.selection_reason}</p>
                </div>
              )}
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
