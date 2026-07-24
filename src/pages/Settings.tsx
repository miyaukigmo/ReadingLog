import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, Download, HardDrive, RefreshCw, Volume2 } from 'lucide-react';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [speechRate, setSpeechRate] = useState('1.1');

  useEffect(() => {
    const savedRate = localStorage.getItem('readingLogSpeechRate');
    if (savedRate) {
      setSpeechRate(savedRate);
    }
  }, []);

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = e.target.value;
    setSpeechRate(newRate);
    localStorage.setItem('readingLogSpeechRate', newRate);
  };

  const handleFullBackup = async () => {
    setExporting(true);
    setMessage('データを取得しています...');
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`*, sections(*, items(*))`);
      
      if (error) throw error;

      const exportData = (data || []).map(doc => ({
        version: "1.0",
        document: {
          type: doc.type,
          title: doc.title,
          authors: doc.authors || [],
          categories: doc.categories || [],
          summary: doc.summary || "",
          keyPoints: doc.key_points || [],
          sections: (doc.sections || []).sort((a:any, b:any) => a.sort_order - b.sort_order).map((sec: any) => ({
            title: sec.title,
            summary: sec.summary || "",
            items: (sec.items || []).sort((a:any, b:any) => a.sort_order - b.sort_order).map((item: any) => ({
              title: item.title,
              summary: item.summary || "",
              detail: item.detail || "",
              reviewPrompt: item.review_prompt || "",
              keywords: item.keywords || []
            }))
          }))
        }
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reading_log_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage('バックアップが完了しました。');
    } catch (err) {
      console.error(err);
      setMessage('エラーが発生しました。');
    } finally {
      setExporting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 p-3 rounded-full">
          <SettingsIcon className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          <p className="text-sm text-gray-500">アプリの設定とデータ管理</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* データ管理 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <HardDrive className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">データ管理</h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">フルバックアップ（JSONエクスポート）</h3>
              <p className="text-xs text-gray-500 mb-3">
                登録されているすべての資料データを、インポート可能なJSON形式でダウンロードします。
              </p>
              <button
                onClick={handleFullBackup}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? '処理中...' : '全データをエクスポート'}
              </button>
              {message && <p className="text-sm text-green-600 mt-2 font-medium">{message}</p>}
            </div>
          </div>
        </section>

        {/* 音声設定 */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Volume2 className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">音声設定</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">読み上げ速度</label>
              <p className="text-xs text-gray-500 mb-3">
                AIレポートやまとめを読み上げる際の再生速度を指定します。
              </p>
              <select 
                value={speechRate}
                onChange={handleRateChange}
                className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="0.75">0.75x (ゆっくり)</option>
                <option value="1.0">1.0x (標準)</option>
                <option value="1.1">1.1x (少し速め)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2.0x (倍速)</option>
              </select>
            </div>
          </div>
        </section>

        {/* その他の設定プレースホルダー */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6 opacity-50">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <SettingsIcon className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">外観（予定）</h2>
          </div>
          <div>
            <p className="text-sm text-gray-500">ダークモードやフォント設定などの外観設定は、今後のアップデートで追加されます。</p>
          </div>
        </section>
      </div>
    </div>
  );
}
