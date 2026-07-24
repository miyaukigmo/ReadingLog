import { useState } from 'react';
import { Camera, Play, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Tools() {
  const [direction, setDirection] = useState('left');
  const [pages, setPages] = useState('auto');
  const [title, setTitle] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRunScreenshot = async () => {
    if (!title) {
      setStatus('error');
      setMessage('タイトル（ファイル名）を入力してください。');
      return;
    }

    setStatus('running');
    setMessage('Kindleスクショを実行中...（5秒以内にKindleウィンドウをアクティブにしてください！）');

    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, pages, title }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(`スクショツールを別ウィンドウで起動しました！\n\n黒い画面（コマンドプロンプト）が立ち上がり、自動でKindleのスクショが始まります。\n終わると「${title}.pdf」が保存されます！`);
      } else {
        setStatus('error');
        setMessage(`エラーが発生しました:\n${data.error}\n${data.stderr || ''}`);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`通信エラーが発生しました: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-2 text-gray-900">
          <Camera className="h-6 w-6 text-gray-900" />
          <h1 className="text-xl font-bold tracking-tight">Tools</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Kindle自動スクショツール */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Kindle自動スクショ＆PDF化</h2>
            <p className="text-sm text-gray-500 mt-1">ローカルにあるKindleスクショツールを起動し、自動でPDFを作成します。</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ページめくり方向</label>
              <select 
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                disabled={status === 'running'}
              >
                <option value="left">Left (左めくり / 横書きや洋書)</option>
                <option value="right">Right (右めくり / 縦書きの和書)</option>
                <option value="down">Down (下スクロール)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">ページ数</label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="数値または 'auto'"
                disabled={status === 'running'}
              />
              <p className="text-xs text-gray-500 mt-1">自動で最後まで進めたい場合は「auto」と入力してください。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">出力ファイル名 (タイトル)</label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: わが闘争"
                disabled={status === 'running'}
              />
              <p className="text-xs text-gray-500 mt-1">拡張子(.pdf)は不要です。</p>
            </div>
          </div>

          {status !== 'idle' && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              status === 'running' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
              status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {status === 'running' ? <Play className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" /> :
               status === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> :
               <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
              <div className="whitespace-pre-wrap text-sm font-medium">
                {message}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleRunScreenshot}
              disabled={status === 'running' || !title}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <Play className="h-4 w-4" />
              {status === 'running' ? '実行中...' : 'スクショを開始'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
