import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Edit, Download, ChevronDown, ChevronRight, CheckCircle2, Sparkles, Volume2, Square, Copy, Link as LinkIcon, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DOCUMENT_TYPE_LABELS, CONNECTION_TYPE_LABELS, CONNECTION_BASIS_LABELS, getLabel, getTypeBadgeClass } from '@/lib/constants';
import { HighlightText } from '@/components/HighlightText';
import { TimelineTab } from '@/components/TimelineTab';
import { PeopleTab } from '@/components/PeopleTab';
import { DocumentNote } from '@/components/DocumentNote';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showNotebookLm, setShowNotebookLm] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // インライン編集用の状態 (セクション)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSummaryText, setEditSummaryText] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // インライン編集用の状態 (項目)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState({ summary: '', detail: '', review_prompt: '' });
  const [isSavingItem, setIsSavingItem] = useState(false);

  const currentTab = searchParams.get('tab') || 'overview';
  const setCurrentTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = (text: string, speakId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.speechSynthesis) {
      alert("お使いのブラウザは音声読み上げに対応していません。");
      return;
    }
    if (speakingId === speakId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[#*`_\[\]]/g, '')
      .replace(/https?:\/\/[^\s]+/g, 'URL省略')
      .replace(/\n+/g, '。');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    const savedRate = localStorage.getItem('readingLogSpeechRate');
    utterance.rate = savedRate ? parseFloat(savedRate) : 1.1;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
    setSpeakingId(speakId);
  };

  useEffect(() => {
    if (id) fetchDocument();
  }, [id]);

  const getInitialTab = (sec: any) => {
    if (sec.summary) return 'summary';
    if (sec.archive_report) return 'archive_report';
    if (sec.original_text) return 'original_text';
    return '';
  };

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
        connections (*),
        timeline_entries (*),
        person_entries (*)
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
      data.timeline_entries?.sort((a: any, b: any) => {
        if (a.sort_year === null && b.sort_year === null) return 0;
        if (a.sort_year === null) return 1;
        if (b.sort_year === null) return -1;
        return a.sort_year - b.sort_year;
      });

      setDoc(data);
      const initialSecState: Record<string, boolean> = {};
      const initialTabs: Record<string, string> = {};
      data.sections?.forEach((sec: any) => {
        initialSecState[sec.id] = true;
        initialTabs[sec.id] = getInitialTab(sec);
      });
      setExpandedSections(initialSecState);
      setActiveTabs(initialTabs);
    }
    setLoading(false);
  };

  // --- 検索フィルタリング ---
  const filteredDoc = useMemo(() => {
    if (!doc) return null;
    if (!searchQuery.trim()) return doc;

    const q = searchQuery.toLowerCase();
    
    const matches = (text?: string) => text ? text.toLowerCase().includes(q) : false;
    const matchesArray = (arr?: string[]) => arr ? arr.some(a => matches(a)) : false;

    const newDoc = { ...doc };

    if (newDoc.sections) {
      newDoc.sections = newDoc.sections.map((sec: any) => {
        const matchedItems = sec.items?.filter((item: any) => 
          matches(item.title) || matches(item.summary) || matches(item.detail) || matches(item.review_prompt) || matchesArray(item.keywords)
        ) || [];

        const secMatches = matches(sec.title) || matches(sec.summary) || matches(sec.archive_report) || matches(sec.original_text) || matchesArray(sec.keywords);

        if (secMatches || matchedItems.length > 0) {
          return {
            ...sec,
            items: sec.items?.length > 0 ? matchedItems : []
          };
        }
        return null;
      }).filter(Boolean);
    }

    if (newDoc.connections) {
      newDoc.connections = newDoc.connections.filter((conn: any) => 
        matches(conn.title) || matches(conn.connection) || matches(conn.question) || matchesArray(conn.starting_points) || matchesArray(conn.search_keywords)
      );
    }

    if (newDoc.timeline_entries) {
      newDoc.timeline_entries = newDoc.timeline_entries.filter((entry: any) => 
        matches(entry.date_label) || matches(entry.title) || matches(entry.display_summary) || matches(entry.source_summary) || matches(entry.external_context) || matchesArray(entry.source_date_expressions) || matchesArray(entry.period_labels) || matchesArray(entry.source_locations) || matchesArray(entry.external_sources?.map((s: any) => `${s.title} ${s.publisher}`))
      );
    }

    if (newDoc.person_entries) {
      newDoc.person_entries = newDoc.person_entries.filter((entry: any) => 
        matches(entry.name) || matches(entry.original_name) || matches(entry.display_summary) || 
        matches(entry.source_summary) || matches(entry.role_in_document) || 
        matches(entry.external_profile) || matches(entry.life_span_label) || matches(entry.identity_note) || 
        matchesArray(entry.source_name_expressions) || matchesArray(entry.key_ideas_or_actions) || 
        matchesArray(entry.source_works) || matchesArray(entry.activity_regions) || 
        matchesArray(entry.source_locations) || 
        matchesArray(entry.external_key_works?.map((w: any) => w.title)) || 
        matchesArray(entry.external_sources?.map((s: any) => `${s.title} ${s.publisher}`))
      );
    }

    return newDoc;
  }, [doc, searchQuery]);

  // 検索ヒット時にアコーディオンを自動で開く
  useEffect(() => {
    if (searchQuery.trim() && filteredDoc) {
      const newExpandedSecs: Record<string, boolean> = {};
      const newExpandedItems: Record<string, boolean> = {};
      
      filteredDoc.sections?.forEach((sec: any) => {
        newExpandedSecs[sec.id] = true;
        sec.items?.forEach((item: any) => {
          newExpandedItems[item.id] = true;
        });
      });

      setExpandedSections(prev => ({ ...prev, ...newExpandedSecs }));
      setExpandedItems(prev => ({ ...prev, ...newExpandedItems }));
    }
  }, [searchQuery, filteredDoc]);
  // -------------------------

  const toggleSection = (secId: string) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const setTab = (secId: string, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [secId]: tab }));
  };

  const toggleItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const startEditingSummary = (secId: string, currentText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSectionId(secId);
    setEditSummaryText(currentText || '');
  };

  const handleSaveSectionSummary = async (secId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!secId) return;
    
    setIsSavingSummary(true);
    try {
      const { error } = await supabase
        .from('sections')
        .update({ summary: editSummaryText })
        .eq('id', secId);

      if (error) throw error;

      setDoc((prev: any) => {
        const newDoc = { ...prev };
        newDoc.sections = newDoc.sections?.map((sec: any) =>
          sec.id === secId ? { ...sec, summary: editSummaryText } : sec
        );
        return newDoc;
      });
      setEditingSectionId(null);
    } catch (err) {
      console.error('Error updating section summary:', err);
      alert('まとめの更新に失敗しました');
    } finally {
      setIsSavingSummary(false);
    }
  };

  const startEditingItem = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setEditItemData({
      summary: item.summary || '',
      detail: item.detail || '',
      review_prompt: item.review_prompt || ''
    });
  };

  const handleSaveItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemId) return;
    
    setIsSavingItem(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          summary: editItemData.summary,
          detail: editItemData.detail,
          review_prompt: editItemData.review_prompt
        })
        .eq('id', itemId);

      if (error) throw error;

      setDoc((prev: any) => {
        const newDoc = { ...prev };
        newDoc.sections = newDoc.sections?.map((sec: any) => ({
          ...sec,
          items: sec.items?.map((item: any) =>
            item.id === itemId
              ? { ...item, summary: editItemData.summary, detail: editItemData.detail, review_prompt: editItemData.review_prompt }
              : item
          )
        }));
        return newDoc;
      });
      setEditingItemId(null);
    } catch (err) {
      console.error('Error updating item:', err);
      alert('項目の更新に失敗しました');
    } finally {
      setIsSavingItem(false);
    }
  };

  const toggleReviewEnabled = async (itemId: string, currentVal: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !currentVal;
    setDoc((prev: any) => {
      const newDoc = { ...prev };
      newDoc.sections?.forEach((sec: any) => {
        const item = sec.items?.find((i: any) => i.id === itemId);
        if (item) item.review_enabled = newVal;
      });
      return newDoc;
    });
    await supabase.from('items').update({ review_enabled: newVal }).eq('id', itemId);
  };

  const toggleVerification = async (itemId: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    setDoc((prev: any) => {
      const newDoc = { ...prev };
      newDoc.sections?.forEach((sec: any) => {
        const item = sec.items?.find((i: any) => i.id === itemId);
        if (item) item.verification_status = newStatus;
      });
      return newDoc;
    });
    await supabase.from('items').update({ verification_status: newStatus }).eq('id', itemId);
  };

  const toggleReadStatus = async () => {
    if (!doc) return;
    const newStatus = !doc.is_read;
    setDoc((prev: any) => ({ ...prev, is_read: newStatus }));
    await supabase.from('documents').update({ is_read: newStatus }).eq('id', doc.id);
  };

  const handleExport = () => {
    if (!doc) return;
    
    const exportData = {
      schemaVersion: "1.3",
      document: {
        purpose: doc.purpose || "study",
        type: doc.type,
        title: doc.title,
        authors: doc.authors || [],
        categories: doc.categories || [],
        summary: doc.summary || "",
        notebookLmReport: doc.notebook_lm_report || "",
        keyPoints: doc.key_points || [],
        is_read: doc.is_read || false,
        sections: (doc.sections || []).map((sec: any) => ({
          title: sec.title,
          summary: sec.summary || "",
          archiveReport: sec.archive_report || "",
          originalText: sec.original_text || "",
          keywords: sec.keywords || [],
          items: (sec.items || []).map((item: any) => ({
            title: item.title,
            summary: item.summary || "",
            detail: item.detail || "",
            reviewPrompt: item.review_prompt || "",
            reviewEnabled: item.review_enabled ?? true,
            keywords: item.keywords || []
          }))
        })),
        connections: (doc.connections || []).map((conn: any) => ({
          type: conn.type,
          title: conn.title,
          connection: conn.connection || "",
          question: conn.question || "",
          startingPoints: conn.starting_points || [],
          searchKeywords: conn.search_keywords || [],
          basis: conn.basis || "inferred"
        })),
        timelineEntries: (doc.timeline_entries || []).map((entry: any) => ({
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
          externalVerificationStatus: entry.external_verification_status || "unverified"
        })),
        peopleEntries: (doc.person_entries || []).map((entry: any) => ({
          name: entry.name,
          sourceNameExpressions: entry.source_name_expressions || [],
          originalName: entry.original_name || "",
          entityKind: entry.entity_kind,
          personType: entry.person_type,
          fields: entry.fields || [],
          importance: entry.importance,
          mentionTypes: entry.mention_types || [],
          displaySummary: entry.display_summary || "",
          sourceSummary: entry.source_summary || "",
          roleInDocument: entry.role_in_document || "",
          keyIdeasOrActions: entry.key_ideas_or_actions || [],
          sourceWorks: entry.source_works || [],
          externalProfile: entry.external_profile || "",
          lifeSpanLabel: entry.life_span_label || "",
          birthYear: entry.birth_year,
          deathYear: entry.death_year,
          lifeDateCertainty: entry.life_date_certainty,
          activityRegions: entry.activity_regions || [],
          externalKeyWorks: entry.external_key_works || [],
          sourceLocations: entry.source_locations || [],
          selectionReason: entry.selection_reason || "",
          identityNote: entry.identity_note || "",
          externalSources: entry.external_sources || [],
          processingStatus: entry.processing_status || "ai_processed",
          sourceVerificationStatus: entry.source_verification_status || "unverified",
          externalVerificationStatus: entry.external_verification_status || "unverified"
        }))
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch (err) {
      console.error(err);
      alert('コピーに失敗しました');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">読み込み中...</div>;
  if (!doc || !filteredDoc) return null;

  const isArchive = doc.purpose === 'archive';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors shrink-0" title="メイン画面に戻る">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 line-clamp-1">
              {isArchive && <span className="mr-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">文章アーカイブ</span>}
              {doc.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isArchive && (
              <button 
                onClick={toggleReadStatus} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-colors shadow-sm ${doc.is_read ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                title={doc.is_read ? "未読に戻す" : "既読にする"}
              >
                {doc.is_read ? (
                  <><CheckCircle2 className="h-4 w-4" /> 既読</>
                ) : (
                  "既読にする"
                )}
              </button>
            )}
            <Link to={`/document/${doc.id}/edit`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="編集">
              <Edit className="h-4 w-4" />
            </Link>
            <button onClick={handleExport} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="エクスポート (JSON)">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* メインタブナビゲーション */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${currentTab === 'overview' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            概要
          </button>
          <button
            onClick={() => setCurrentTab('sections')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${currentTab === 'sections' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            セクション
          </button>
          <button
            onClick={() => setCurrentTab('timeline')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${currentTab === 'timeline' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            年代
          </button>
          <button
            onClick={() => setCurrentTab('people')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${currentTab === 'people' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            人物
          </button>
          {isArchive && (
            <button
              onClick={() => setCurrentTab('connections')}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${currentTab === 'connections' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              次に学ぶ
            </button>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-2 sm:px-6 lg:px-8 space-y-8">
        
        {/* パーソナルノート */}
        <DocumentNote 
          documentId={doc.id}
          initialNote={doc.personal_note || doc.personalNote || null}
          sections={doc.sections || []}
        />
        
        {/* 検索バー */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="この資料内を検索..."
            className="block w-full border-0 p-0 text-gray-900 focus:ring-0 sm:text-sm placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors">
              クリア
            </button>
          )}
        </div>

        {searchQuery && filteredDoc.sections?.length === 0 && filteredDoc.connections?.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">一致する情報が見つかりませんでした。</p>
          </div>
        )}

        {/* ヘッダー情報 */}
        {currentTab === 'overview' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getTypeBadgeClass(doc.type)}`}>
                {getLabel(DOCUMENT_TYPE_LABELS, doc.type, doc.type)}
              </span>
              <div className="flex flex-wrap gap-1">
                {doc.categories?.map((c: string, i: number) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    <HighlightText text={c} query={searchQuery} />
                  </span>
                ))}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              <HighlightText text={doc.title} query={searchQuery} />
            </h1>
            {doc.authors && doc.authors.length > 0 && (
              <p className="mt-3 text-base text-gray-600 font-medium">
                {doc.authors.map((a: string, i: number) => (
                  <span key={i}>
                    <HighlightText text={a} query={searchQuery} />
                    {i < doc.authors.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            )}

            {doc.summary && (
              <div className="pt-6 mt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900">資料全体のまとめ</h3>
                  <button
                    onClick={(e) => handleSpeak(doc.summary, 'summary', e)}
                    className={`p-2 rounded-full transition-colors ${speakingId === 'summary' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                    title={speakingId === 'summary' ? "読み上げ停止" : "読み上げ開始"}
                  >
                    {speakingId === 'summary' ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  <HighlightText text={doc.summary} query={searchQuery} />
                </p>
              </div>
            )}

            {doc.key_points && doc.key_points.length > 0 && (
              <div className="pt-6 mt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">重要ポイント</h3>
                <ul className="space-y-2">
                  {doc.key_points.map((point: string, i: number) => (
                    <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                      <CheckCircle2 className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <span>
                        <HighlightText text={point} query={searchQuery} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        )}
        {currentTab === 'overview' && doc.notebook_lm_report && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowNotebookLm(!showNotebookLm)}
              className="w-full px-4 sm:px-8 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-900 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {isArchive ? "NotebookLM 全体再読レポート" : "NotebookLM AI レポート"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleSpeak(doc.notebook_lm_report, 'notebook_lm', e)}
                  className={`p-2 rounded-full transition-colors ${speakingId === 'notebook_lm' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                  title={speakingId === 'notebook_lm' ? "読み上げ停止" : "読み上げ開始"}
                >
                  {speakingId === 'notebook_lm' ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                </button>
                {showNotebookLm ? <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />}
              </div>
            </button>
            {showNotebookLm && (
              <div className="p-6 sm:p-8 border-t border-gray-100 bg-gray-50/50">
                <article className="prose prose-sm sm:prose-base prose-gray max-w-none prose-headings:font-bold">
                  {/* Markdownのためハイライトはスキップ */}
                  <ReactMarkdown>{doc.notebook_lm_report}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}

        {/* セクション一覧 */}
        {currentTab === 'sections' && (
        <div className="space-y-6">
          {filteredDoc.sections?.map((sec: any) => {
            const isSecOpen = expandedSections[sec.id];
            
            if (isArchive) {
              // --- Archive資料用のセクション表示 ---
              const tabs = [];
              if (sec.summary) tabs.push({ id: 'summary', label: '概要' });
              if (sec.archive_report) tabs.push({ id: 'archive_report', label: '詳しい整理' });
              if (sec.original_text) tabs.push({ id: 'original_text', label: '原文' });

              const currentTab = activeTabs[sec.id] || tabs[0]?.id;

              return (
                <div key={sec.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="pr-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        <HighlightText text={sec.title} query={searchQuery} />
                      </h2>
                      {sec.keywords && sec.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sec.keywords.map((k: string, i: number) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                              #<HighlightText text={k} query={searchQuery} />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isSecOpen ? <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />}
                  </button>

                  {isSecOpen && tabs.length > 0 && (
                    <div className="border-t border-gray-200">
                      {tabs.length > 1 && (
                        <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-2 scrollbar-hide">
                          {tabs.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setTab(sec.id, tab.id)}
                              className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                                currentTab === tab.id
                                  ? 'border-gray-900 text-gray-900'
                                  : 'border-transparent text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="p-6">
                        {currentTab === 'summary' && (
                          <div className="relative group/summary">
                            {editingSectionId === sec.id ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-3 min-h-[120px]"
                                  value={editSummaryText}
                                  onChange={(e) => setEditSummaryText(e.target.value)}
                                  disabled={isSavingSummary}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingSectionId(null)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={isSavingSummary}
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    onClick={(e) => handleSaveSectionSummary(sec.id, e)}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:bg-purple-400"
                                    disabled={isSavingSummary}
                                  >
                                    {isSavingSummary ? '保存中...' : '保存'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => startEditingSummary(sec.id, sec.summary, e)}
                                  className="absolute right-0 top-0 -mt-2 p-1.5 text-gray-400 hover:text-gray-700 bg-white/80 rounded-md opacity-0 group-hover/summary:opacity-100 transition-opacity flex items-center gap-1 text-xs font-bold"
                                  title="まとめを編集"
                                >
                                  <Edit className="h-4 w-4" /> 編集
                                </button>
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  <HighlightText text={sec.summary} query={searchQuery} />
                                </p>
                              </>
                            )}
                          </div>
                        )}
                        {currentTab === 'archive_report' && (
                          <article className="prose prose-sm sm:prose-base prose-gray max-w-none">
                            <ReactMarkdown>{sec.archive_report}</ReactMarkdown>
                          </article>
                        )}
                        {currentTab === 'original_text' && (
                          <div className="relative group">
                            <button
                              onClick={() => copyToClipboard(sec.original_text)}
                              className="absolute right-0 top-0 p-2 text-gray-400 hover:text-gray-700 bg-white/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-bold"
                            >
                              <Copy className="h-4 w-4" /> コピー
                            </button>
                            <div className="whitespace-pre-wrap font-sans text-gray-800 leading-[1.8] text-[15px] sm:text-base selection:bg-purple-100">
                              <HighlightText text={sec.original_text} query={searchQuery} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // --- Study資料用のセクション表示 ---
              let verifiedCount = 0;
              let reviewCount = 0;
              sec.items?.forEach((item: any) => {
                if (item.verification_status === 'verified') verifiedCount++;
                if (item.review_enabled) reviewCount++;
              });

              return (
                <div key={sec.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="pr-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        <HighlightText text={sec.title} query={searchQuery} />
                      </h2>
                      <div className="mt-1 flex items-center gap-4 text-xs font-medium text-gray-500">
                        <span>項目: {sec.items?.length || 0}</span>
                        <span className="text-gray-700">復習対象: {reviewCount}</span>
                        <span className="text-gray-700">確認済: {verifiedCount}</span>
                      </div>
                    </div>
                    {isSecOpen ? <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" /> : <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />}
                  </button>

                  {isSecOpen && (
                    <div className="p-6 border-t border-gray-200 space-y-6">
                      {sec.summary && (
                        <div className="relative group/summary">
                          {editingSectionId === sec.id ? (
                            <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-lg">
                              <textarea
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm p-3 min-h-[100px]"
                                value={editSummaryText}
                                onChange={(e) => setEditSummaryText(e.target.value)}
                                disabled={isSavingSummary}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingSectionId(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                  disabled={isSavingSummary}
                                >
                                  キャンセル
                                </button>
                                <button
                                  onClick={(e) => handleSaveSectionSummary(sec.id, e)}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 border border-transparent rounded-md hover:bg-gray-900 disabled:bg-gray-400"
                                  disabled={isSavingSummary}
                                >
                                  {isSavingSummary ? '保存中...' : '保存'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <button
                                onClick={(e) => startEditingSummary(sec.id, sec.summary, e)}
                                className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50/80 rounded-md opacity-0 group-hover/summary:opacity-100 transition-opacity flex items-center gap-1 text-xs font-bold"
                                title="まとめを編集"
                              >
                                <Edit className="h-4 w-4" /> 編集
                              </button>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                <HighlightText text={sec.summary} query={searchQuery} />
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-3">
                        {sec.items?.map((item: any) => {
                          const isItemOpen = expandedItems[item.id];
                          return (
                            <div
                              key={item.id}
                              className={`rounded-xl border transition-all cursor-pointer ${
                                isItemOpen ? 'border-gray-300 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              onClick={(e) => toggleItem(item.id, e)}
                            >
                              <div className="p-4 sm:px-5 flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-base font-bold text-gray-900">
                                      <HighlightText text={item.title} query={searchQuery} />
                                    </h4>
                                    <button
                                      onClick={(e) => toggleVerification(item.id, item.verification_status, e)}
                                      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                        item.verification_status === 'verified'
                                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                      }`}
                                    >
                                      {item.verification_status === 'verified' ? '確認済' : '未確認'}
                                    </button>
                                    <button
                                      onClick={(e) => toggleReviewEnabled(item.id, item.review_enabled, e)}
                                      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                        item.review_enabled
                                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                      }`}
                                    >
                                      {item.review_enabled ? '復習ON' : '復習OFF'}
                                    </button>
                                  </div>
                                  {!isItemOpen && item.summary && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                      <HighlightText text={item.summary} query={searchQuery} />
                                    </p>
                                  )}
                                </div>
                                <button className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
                                  {isItemOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                </button>
                              </div>

                              {isItemOpen && (
                                <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl relative group/item">
                                  {editingItemId === item.id ? (
                                    <div className="space-y-4 pt-2">
                                      <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">概要</label>
                                        <textarea
                                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                                          value={editItemData.summary}
                                          onChange={(e) => setEditItemData(prev => ({ ...prev, summary: e.target.value }))}
                                          disabled={isSavingItem}
                                          rows={3}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">詳細</label>
                                        <textarea
                                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                                          value={editItemData.detail}
                                          onChange={(e) => setEditItemData(prev => ({ ...prev, detail: e.target.value }))}
                                          disabled={isSavingItem}
                                          rows={5}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1 block">復習用の問い</label>
                                        <textarea
                                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                                          value={editItemData.review_prompt}
                                          onChange={(e) => setEditItemData(prev => ({ ...prev, review_prompt: e.target.value }))}
                                          disabled={isSavingItem}
                                          rows={2}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2 pt-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEditingItemId(null); }}
                                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                          disabled={isSavingItem}
                                        >
                                          キャンセル
                                        </button>
                                        <button
                                          onClick={(e) => handleSaveItem(item.id, e)}
                                          className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 border border-transparent rounded-md hover:bg-gray-900 disabled:bg-gray-400"
                                          disabled={isSavingItem}
                                        >
                                          {isSavingItem ? '保存中...' : '保存'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={(e) => startEditingItem(item, e)}
                                        className="absolute right-4 top-2 p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50/80 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 text-xs font-bold"
                                        title="項目を編集"
                                      >
                                        <Edit className="h-4 w-4" /> 編集
                                      </button>
                                      <div className="space-y-4 pt-2">
                                        {item.summary && (
                                          <div>
                                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">概要</h5>
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                              <HighlightText text={item.summary} query={searchQuery} />
                                            </p>
                                          </div>
                                        )}
                                        {item.detail && (
                                          <div>
                                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">詳細</h5>
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                              <HighlightText text={item.detail} query={searchQuery} />
                                            </p>
                                          </div>
                                        )}
                                        {item.review_prompt && (
                                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                                            <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">復習用の問い</h5>
                                            <p className="text-sm text-gray-800">
                                              <HighlightText text={item.review_prompt} query={searchQuery} />
                                            </p>
                                          </div>
                                        )}
                                        {item.keywords?.length > 0 && (
                                          <div className="flex flex-wrap gap-2 pt-2">
                                            {item.keywords.map((k: string, i: number) => (
                                              <span key={i} className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                                #<HighlightText text={k} query={searchQuery} />
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
        )}

        {/* 年代タブ */}
        {currentTab === 'timeline' && (
          <TimelineTab 
            documentId={doc.id}
            documentTitle={doc.title}
            entries={(filteredDoc.timeline_entries || []).map((entry: any) => ({
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
              externalVerificationStatus: entry.external_verification_status || "unverified"
            }))}
            onRefresh={fetchDocument}
          />
        )}

        {/* 人物タブ */}
        {currentTab === 'people' && (
          <PeopleTab 
            documentId={doc.id}
            documentTitle={doc.title}
            entries={(filteredDoc.person_entries || [])}
            onRefresh={fetchDocument}
          />
        )}

        {/* 次に学ぶ (Connections) - archive専用 */}
        {currentTab === 'connections' && isArchive && filteredDoc.connections && filteredDoc.connections.length > 0 && (
          <div className="pt-2">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <LinkIcon className="h-6 w-6 text-purple-600" />
              次に学ぶ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoc.connections.map((conn: any) => (
                <div key={conn.id} className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 mb-2">
                        {getLabel(CONNECTION_TYPE_LABELS, conn.type, conn.type)}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        <HighlightText text={conn.title} query={searchQuery} />
                      </h3>
                    </div>
                    {conn.basis && (
                      <span className="shrink-0 inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {getLabel(CONNECTION_BASIS_LABELS, conn.basis, conn.basis)}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-4 flex-1">
                    {conn.connection && (
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">なぜつながるか</h4>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          <HighlightText text={conn.connection} query={searchQuery} />
                        </p>
                      </div>
                    )}
                    {conn.question && (
                      <div>
                        <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">さらに考えたい問い</h4>
                        <p className="text-sm text-gray-800 font-medium">
                          <HighlightText text={conn.question} query={searchQuery} />
                        </p>
                      </div>
                    )}
                    {((conn.starting_points && conn.starting_points.length > 0) || (conn.search_keywords && conn.search_keywords.length > 0)) && (
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        {conn.starting_points && conn.starting_points.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 mb-1">入口となる人物・概念・文献</h4>
                            <div className="flex flex-wrap gap-1">
                              {conn.starting_points.map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
                                  <HighlightText text={p} query={searchQuery} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {conn.search_keywords && conn.search_keywords.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 mb-1">検索キーワード</h4>
                            <div className="flex flex-wrap gap-1">
                              {conn.search_keywords.map((k: string, i: number) => (
                                <span key={i} className="inline-flex items-center rounded-sm border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600">
                                  <Search className="h-3 w-3 mr-1 text-gray-400" />
                                  <HighlightText text={k} query={searchQuery} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
