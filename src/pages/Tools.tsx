import { useState } from 'react';
import { Camera, Play, AlertCircle, CheckCircle2, Copy, Check, Bot } from 'lucide-react';

const NOTEBOOK_LM_PROMPT = `選択されている資料の内容を、短時間で全体を再読できるような「詳細読書レポート」としてまとめてください。

このレポートの目的は、重要項目だけを箇条書きで確認することではなく、資料がどのような順序で議論を進め、各部分が全体の中でどのような役割を果たしているかを、読み直せる形で整理することです。

【基本方針】

・資料の冒頭から末尾まで、原資料の順番に沿って整理する
・文字数に制限がある場合は、内容が簡潔になってもしっかりとすべての章・節などをかき切ることを優先する。
・著者が何を問題として提示し、何を主張し、どのような理由や具体例を用いて、次の議論へ進んでいるかを明らかにする
・項目の羅列ではなく、議論や説明の流れがつながって理解できる文章にする
・原資料を完全に再現するほど細かくはせず、重要な議論を省略しすぎない
・簡単な概要ではなく、このレポートを読めば資料を一度軽く再読したのに近い理解を得られる程度の詳しさにする
・資料内の情報だけを使用し、外部知識や一般論を追加しない
・著者自身の主張と、著者が紹介・批判・引用している他者の見解を区別する
・専門用語や重要概念は、初めて登場する箇所で簡潔に説明する
・細かな例や逸話はすべて列挙せず、議論の理解に必要なものだけを残す
・同じ内容が繰り返される場合は整理してまとめるが、議論が発展または修正されている場合は、その変化が分かるようにする
・可能な範囲で、内容の根拠となる出典番号を付ける

【資料の構成の扱い】

資料に章・節・項などの明確な構成がある場合は、その構成と順番を維持してください。

章・節がない資料、または構成が細かすぎる資料では、話題や議論の転換をもとに、内容を理解しやすいまとまりへ整理してください。その場合は、原資料に存在する見出しであるかのように扱わず、「整理上の区分」であることが分かる見出しを付けてください。

論文では、一般的な「序論・方法・結果・考察」の形式へ無理に当てはめず、その論文が実際に展開している問題設定、先行研究の検討、分析、主張、結論の順序を優先してください。

複数の資料が選択されている場合は、基本的に資料ごとに分けて整理してください。複数資料が一つの連続した内容を構成している場合のみ、全体を統合して整理してください。

【出力構成】

# 資料の基本情報

・タイトル
・著者
・資料の種類
・主な分野

# 全体の見取り図

資料全体が何を扱い、どのような問題から出発し、どのような順序で議論を進め、最終的にどこへ到達するのかを、数段落でまとめてください。

ここでは結論だけでなく、資料全体の展開が見渡せるようにしてください。

# 本文の詳細な展開

原資料の章・節、または整理上のまとまりごとに、資料の最初から順番にまとめてください。

各部分は、原則として次の内容を含めてください。

## 章・節・まとまりの見出し

### この部分の役割

この部分が資料全体の中で何を行う箇所なのかを、1〜2文で説明してください。

### 議論・説明の展開

この部分に書かれている内容を、文章の流れに沿って詳しくまとめてください。

特に以下が分かるようにしてください。

・ここで提示される問題や問い
・著者の中心的な主張
・主張を支える理由、論証、比較、分析
・重要な概念や区別
・必要不可欠な具体例
・著者が批判または修正している見解
・この部分で到達する小さな結論
・その結論が次の章や節へどうつながるか

元の章や節が短い場合は、無理に各項目を分けず、自然な文章としてまとめてください。

### この部分で押さえること

この部分を再読したときに特に覚えておくべき内容を、2〜5点程度の短い箇条書きで示してください。

この形式で、資料の最後まで順番に整理してください。

# 資料全体の結論

資料全体を通じて著者が最終的に示した主張、到達点、提案をまとめてください。

単なる章ごとの要約の繰り返しではなく、各部分の議論が最終的にどのように結びついたのかを説明してください。

著者が明確な結論を示していない場合は、資料から読み取れる到達点と、未解決のまま残された問題を区別してください。

# 再読時に確認したいポイント

後から原資料を読み返す際に、特に注意して確認したい論点、概念、区別、議論上の転換を5〜10点程度挙げてください。

単語だけではなく、「何に注意して読み返すべきか」が分かる文章にしてください。

【文章量と詳しさ】

・資料の長さと内容の密度に応じて、各章・節の分量を調整する
・中心的な章や議論は詳しく、導入的・補助的な部分は短めにする
・各章を同じ分量に機械的にそろえない
・短すぎる概要にはせず、かといって原資料の言い換えを延々と続けない
・読みやすい見出しと段落を使い、長大な箇条書きだけのレポートにはしない
`;

export default function Tools() {
  const [direction, setDirection] = useState('left');
  const [pages, setPages] = useState('auto');
  const [title, setTitle] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(NOTEBOOK_LM_PROMPT);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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

        {/* AIプロンプト集 */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-gray-900" />
                <h2 className="text-lg font-bold text-gray-900">AI アシスタント用プロンプト</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">AIに投げて資料のまとめを作ってもらうための便利なプロンプト集です。</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900">詳細読書レポート（NotebookLM等）</h3>
                <p className="text-sm text-gray-500 mt-1">資料の構造を保ちながら、再読するのに適した詳細なレポートを生成させます。</p>
              </div>
              <button
                onClick={handleCopyPrompt}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors shrink-0 ${
                  isCopied 
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピーしました！
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    プロンプトをコピー
                  </>
                )}
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none rounded-t-lg"></div>
              <textarea
                className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs sm:text-sm font-mono text-gray-600 resize-y min-h-[160px] focus:outline-none"
                value={NOTEBOOK_LM_PROMPT}
                readOnly
              />
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none rounded-b-lg"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
