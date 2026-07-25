import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Edit, Download, Trash2, ChevronDown, ChevronRight, CheckCircle2, Sparkles, Volume2, Square, Copy, Link as LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_PURPOSE_LABELS, CONNECTION_TYPE_LABELS, CONNECTION_BASIS_LABELS, getLabel } from '@/lib/constants';

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

  const handleExport = () => {
    if (!doc) return;
    
    const exportData = {
      schemaVersion: "1.1",
      document: {
        purpose: doc.purpose || "study",
        type: doc.type,
        title: doc.title,
        authors: doc.authors || [],
        categories: doc.categories || [],
        summary: doc.summary || "",
        notebookLmReport: doc.notebook_lm_report || "",
        keyPoints: doc.key_points || [],
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
  if (!doc) return null;

  const isArchive = doc.purpose === 'archive';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 line-clamp-1">
              {isArchive && <span className="mr-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">文章アーカイブ</span>}
              {doc.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/document/${doc.id}/edit`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="編集">
              <Edit className="h-4 w-4" />
            </Link>
            <button onClick={handleExport} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="エクスポート (JSON)">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* ヘッダー情報 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10">
                {getLabel(DOCUMENT_TYPE_LABELS, doc.type, doc.type)}
              </span>
              <div className="flex flex-wrap gap-1">
                {doc.categories?.map((c: string, i: number) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{doc.title}</h1>
            {doc.authors && doc.authors.length > 0 && (
              <p className="mt-3 text-base text-gray-600 font-medium">{doc.authors.join(', ')}</p>
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
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{doc.summary}</p>
              </div>
            )}

            {doc.key_points && doc.key_points.length > 0 && (
              <div className="pt-6 mt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">重要ポイント</h3>
                <ul className="space-y-2">
                  {doc.key_points.map((point: string, i: number) => (
                    <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                      <CheckCircle2 className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* NotebookLM レポート */}
        {doc.notebook_lm_report && (
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
                  <ReactMarkdown>{doc.notebook_lm_report}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}

        {/* セクション一覧 */}
        <div className="space-y-6">
          {doc.sections?.map((sec: any) => {
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
                      <h2 className="text-lg font-bold text-gray-900">{sec.title}</h2>
                      {sec.keywords && sec.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sec.keywords.map((k: string, i: number) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                              #{k}
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
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{sec.summary}</p>
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
                              {sec.original_text}
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
                      <h2 className="text-lg font-bold text-gray-900">{sec.title}</h2>
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
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                          {sec.summary}
                        </p>
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
                                    <h4 className="text-base font-bold text-gray-900">{item.title}</h4>
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
                                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.summary}</p>
                                  )}
                                </div>
                                <button className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
                                  {isItemOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                </button>
                              </div>

                              {isItemOpen && (
                                <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl space-y-4">
                                  {item.summary && (
                                    <div>
                                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">概要</h5>
                                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.summary}</p>
                                    </div>
                                  )}
                                  {item.detail && (
                                    <div>
                                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">詳細</h5>
                                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{item.detail}</p>
                                    </div>
                                  )}
                                  {item.review_prompt && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">復習用の問い</h5>
                                      <p className="text-sm text-gray-800">{item.review_prompt}</p>
                                    </div>
                                  )}
                                  {item.keywords?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      {item.keywords.map((k: string, i: number) => (
                                        <span key={i} className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                          #{k}
                                        </span>
                                      ))}
                                    </div>
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

        {/* 次に学ぶ (Connections) - archive専用 */}
        {isArchive && doc.connections && doc.connections.length > 0 && (
          <div className="pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <LinkIcon className="h-6 w-6 text-purple-600" />
              次に学ぶ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doc.connections.map((conn: any) => (
                <div key={conn.id} className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 mb-2">
                        {getLabel(CONNECTION_TYPE_LABELS, conn.type, conn.type)}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{conn.title}</h3>
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
                        <p className="text-sm text-gray-800 leading-relaxed">{conn.connection}</p>
                      </div>
                    )}
                    {conn.question && (
                      <div>
                        <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">さらに考えたい問い</h4>
                        <p className="text-sm text-gray-800 font-medium">{conn.question}</p>
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
                                  {p}
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
                                  {k}
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
