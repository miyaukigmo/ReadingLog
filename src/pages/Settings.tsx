import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { backupSchema } from '@/types/schema';
import type { BackupDataV12 } from '@/types/schema';
import { Settings as SettingsIcon, Download, HardDrive, RefreshCw, Volume2, Upload, AlertCircle, CheckCircle2, FileJson } from 'lucide-react';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [speechRate, setSpeechRate] = useState('1.1');

  // 復元用の状態
  const [, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupDataV12 | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

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
      // 全データの取得
      const [docsRes, secsRes, itemsRes, connsRes, logsRes, timelineRes] = await Promise.all([
        supabase.from('documents').select('*'),
        supabase.from('sections').select('*'),
        supabase.from('items').select('*'),
        supabase.from('connections').select('*'),
        supabase.from('review_logs').select('*'),
        supabase.from('timeline_entries').select('*')
      ]);

      if (docsRes.error) throw docsRes.error;
      if (secsRes.error) throw secsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (connsRes.error) throw connsRes.error;
      if (logsRes.error) throw logsRes.error;

      const exportData = {
        format: "readinglog-backup" as const,
        backupVersion: "1.2" as const,
        exportedAt: new Date().toISOString(),
        data: {
          documents: docsRes.data || [],
          sections: secsRes.data || [],
          items: itemsRes.data || [],
          connections: connsRes.data || [],
          reviewLogs: logsRes.data || [],
          timelineEntries: timelineRes.data || []
        }
      };

      // 念のためZodで検証（スキーマに合致しているか）
      const parsed = backupSchema.parse(exportData);

      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // YYYY-MM-DD-HHmm 形式
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      
      a.download = `readinglog-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage('バックアップが完了しました。');
    } catch (err: any) {
      console.error(err);
      setMessage(`エラーが発生しました: ${err.message}`);
    } finally {
      setExporting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreError(null);
    setRestorePreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // バリデーション
        const result = backupSchema.safeParse(parsed);
        if (!result.success) {
          const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
          throw new Error(`バックアップデータの形式が正しくありません: ${issues}`);
        }

        // v1.0, v1.1からの正規化
        let normalizedData: BackupDataV12;
        if (result.data.backupVersion === '1.0' || result.data.backupVersion === '1.1') {
          const d = result.data.data as any;
          normalizedData = {
            format: "readinglog-backup",
            backupVersion: "1.2",
            exportedAt: result.data.exportedAt,
            data: {
              documents: d.documents.map((doc: any) => ({ ...doc, purpose: doc.purpose || 'study' })),
              sections: d.sections.map((sec: any) => ({
                ...sec,
                original_text: sec.original_text || '',
                archive_report: sec.archive_report || '',
                keywords: sec.keywords || []
              })),
              items: d.items,
              connections: d.connections || [],
              reviewLogs: d.reviewLogs || [],
              timelineEntries: []
            }
          };
        } else {
          normalizedData = result.data as BackupDataV12;
        }

        setRestorePreview(normalizedData);
      } catch (err: any) {
        if (err instanceof SyntaxError) {
          setRestoreError('有効なJSONではありません。');
        } else {
          setRestoreError(err.message || '予期せぬエラーが発生しました。');
        }
      }
    };
    reader.onerror = () => {
      setRestoreError('ファイルの読み込みに失敗しました。');
    };
    reader.readAsText(file);
    e.target.value = ''; // リセット
  };

  const executeRestore = async () => {
    if (!restorePreview) return;

    // 強い確認ダイアログ
    const confirmText = prompt(
      "【警告】現在のデータはすべて削除され、バックアップ内容に置き換わります。\n" +
      "復元を始める前に、現在の状態をバックアップしておくことを強く推奨します。\n\n" +
      "本当によろしいですか？\n実行する場合は「復元する」と入力してください。"
    );

    if (confirmText !== '復元する') {
      alert("キャンセルしました。");
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);

    try {
      // RPC呼び出し
      const { data, error } = await supabase.rpc('restore_full_backup', {
        backup_data: restorePreview.data
      });

      if (error) {
        throw new Error(error.message);
      }

      // 件数チェック
      const resultDocs = data.documents;
      const resultSecs = data.sections;
      const resultItems = data.items;
      const resultConns = data.connections;
      const resultLogs = data.reviewLogs;
      const resultTimelines = data.timelineEntries;

      const expectedDocs = restorePreview.data.documents.length;
      const expectedSecs = restorePreview.data.sections.length;
      const expectedItems = restorePreview.data.items.length;
      const expectedConns = restorePreview.data.connections.length;
      const expectedLogs = restorePreview.data.reviewLogs.length;
      const expectedTimelines = restorePreview.data.timelineEntries.length;

      if (
        resultDocs !== expectedDocs ||
        resultSecs !== expectedSecs ||
        resultItems !== expectedItems ||
        resultConns !== expectedConns ||
        resultLogs !== expectedLogs ||
        resultTimelines !== expectedTimelines
      ) {
        throw new Error("復元されたデータ件数がバックアップ内の件数と一致しませんでした。");
      }

      alert("データの復元が完了しました！");
      setRestorePreview(null);
      setRestoreFile(null);
    } catch (err: any) {
      console.error(err);
      setRestoreError(`復元に失敗しました: ${err.message}`);
    } finally {
      setIsRestoring(false);
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

          <div className="space-y-8">
            {/* バックアップ */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">全データ バックアップ</h3>
              <p className="text-xs text-gray-500 mb-3">
                アプリ内のすべてのデータ（資料、復習履歴など）をJSONファイルとして保存します。
              </p>
              <button
                onClick={handleFullBackup}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? '処理中...' : 'バックアップを作成'}
              </button>
              {message && <p className="text-sm text-green-600 mt-2 font-medium">{message}</p>}
            </div>

            <hr className="border-gray-100" />

            {/* 復元 */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">バックアップから復元</h3>
              <p className="text-xs text-gray-500 mb-3">
                バックアップしたJSONファイルから全データを復元します。<br/>
                <span className="text-red-500 font-bold">※現在のデータはすべて削除され、置き換わります。</span>
              </p>
              
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <FileJson className="h-4 w-4 text-gray-500" />
                バックアップファイルを選択
                <input type="file" accept=".json" className="hidden" onChange={handleRestoreFileChange} disabled={isRestoring} />
              </label>

              {restoreError && (
                <div className="mt-4 flex items-start gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-wrap break-words">{restoreError}</div>
                </div>
              )}

              {restorePreview && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-blue-800 border-b border-blue-200/50 pb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <h4 className="font-bold">バックアップ内容のプレビュー</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-blue-600/80 text-xs font-bold">作成日時</span>
                      <span className="font-medium text-gray-900">
                        {new Date(restorePreview.exportedAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-blue-600/80 text-xs font-bold">フォーマット</span>
                      <span className="font-medium text-gray-900">{restorePreview.format} v{restorePreview.backupVersion}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{restorePreview.data.documents.length}</div>
                      <div className="text-[10px] text-gray-500">資料</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{restorePreview.data.sections.length}</div>
                      <div className="text-[10px] text-gray-500">セクション</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{restorePreview.data.items.length}</div>
                      <div className="text-[10px] text-gray-500">項目</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{restorePreview.data.connections.length}</div>
                      <div className="text-[10px] text-gray-500">接続</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{restorePreview.data.timelineEntries.length}</div>
                      <div className="text-[10px] text-gray-500">年代</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{restorePreview.data.reviewLogs.length}</div>
                      <div className="text-[10px] text-gray-500">履歴</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={executeRestore}
                      disabled={isRestoring}
                      className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> 復元中...</>
                      ) : (
                        <><Upload className="h-4 w-4" /> このデータで復元を実行する</>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
      </div>
    </div>
  );
}
