import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Extension, wrappingInputRule } from '@tiptap/core';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentNoteProps {
  documentId: string;
  initialNote: string | null;
  sections: { title: string }[];
}

// 「・」で箇条書きを開始するためのカスタム拡張
const CustomBulletListInputRule = Extension.create({
  name: 'customBulletListRule',
  addInputRules() {
    return [
      wrappingInputRule({
        // 「・」＋半角スペース または 「・」＋全角スペース
        find: /^[・][ \u3000]$/,
        type: this.editor.schema.nodes.bulletList,
      }),
    ];
  },
});

export const DocumentNote: React.FC<DocumentNoteProps> = ({ documentId, initialNote, sections }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期テンプレートの生成（保存されたノートがない場合）
  const getInitialContent = () => {
    if (initialNote) return initialNote;
    
    // セクション情報からテンプレートを作成
    if (sections && sections.length > 0) {
      const template = sections.map(sec => `<h2>${sec.title}</h2><p></p>`).join('');
      return template;
    }
    return '<h2>ノート</h2><p></p>';
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      CustomBulletListInputRule,
    ],
    content: getInitialContent(),
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[200px] p-4 bg-white rounded-lg border border-gray-200',
      },
    },
    onUpdate: ({ editor }) => {
      // 入力があるたびにデバウンスして自動保存
      const html = editor.getHTML();
      handleAutoSave(html);
    },
  });

  const handleAutoSave = useCallback((content: string) => {
    setSaveMessage('保存中...');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('documents')
          .update({ personal_note: content })
          .eq('id', documentId);

        if (error) throw error;
        setSaveMessage('保存しました');
        setTimeout(() => setSaveMessage(''), 2000);
      } catch (err) {
        console.error('Failed to save note:', err);
        setSaveMessage('保存に失敗しました');
      }
    }, 1000); // 1秒間入力がなければ保存
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mb-8 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          <span className="font-bold text-gray-800">パーソナルノート</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {saveMessage && (
            <span className="flex items-center gap-1">
              {saveMessage === '保存しました' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {saveMessage}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="mb-2 text-xs text-gray-500 flex gap-4">
            <span>💡 箇条書き: <kbd className="px-1 py-0.5 bg-gray-200 rounded">・</kbd> + スペース</span>
            <span>💡 太字: <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+B</kbd></span>
            <span>💡 アンダーライン: <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+U</kbd></span>
          </div>
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
};
