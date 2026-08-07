import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import Heading from '@tiptap/extension-heading';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension, wrappingInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface DocumentNoteProps {
  documentId: string;
  initialNote: string | null;
  sections: { title: string }[];
}

// 「・」で箇条書きを開始するためのカスタム拡張（・＋スペース）
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

// 「・」＋エンター で箇条書きを開始するショートカット
const CustomBulletListShortcut = Extension.create({
  name: 'customBulletListShortcut',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const currentLineText = $from.parent.textContent;

        if (currentLineText.trim() === '・') {
          return this.editor
            .chain()
            .deleteRange({ from: $from.pos - currentLineText.length, to: $from.pos })
            .toggleList('bulletList', 'listItem')
            .run();
        }
        return false;
      },
    };
  },
});

// 画像アップロード用のProseMirrorプラグイン
const ImageUploadPlugin = (onUploadStart: () => void, onUploadEnd: () => void) => {
  return new Plugin({
    key: new PluginKey('imageUpload'),
    props: {
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items || []);
        const image = items.find(item => item.type.startsWith('image/'));
        
        if (image) {
          const file = image.getAsFile();
          if (file) {
            event.preventDefault();
            uploadImage(file, view, onUploadStart, onUploadEnd);
            return true;
          }
        }
        return false;
      },
      handleDrop(view, event, _slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            uploadImage(file, view, onUploadStart, onUploadEnd);
            return true;
          }
        }
        return false;
      }
    }
  });
};

const uploadImage = async (file: File, view: any, onUploadStart: () => void, onUploadEnd: () => void) => {
  onUploadStart();
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${uuidv4()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('note_images')
      .upload(fileName, file);
      
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('note_images')
      .getPublicUrl(fileName);
      
    // エディタに画像を挿入
    const { schema } = view.state;
    const node = schema.nodes.image.create({ src: data.publicUrl });
    const transaction = view.state.tr.replaceSelectionWith(node);
    view.dispatch(transaction);
    
  } catch (err) {
    console.error('Image upload failed:', err);
    alert('画像のアップロードに失敗しました');
  } finally {
    onUploadEnd();
  }
};

const HeadingNodeView = (props: any) => {
  const { node, updateAttributes } = props;
  const { collapsed } = node.attrs;
  const level = node.attrs.level as 1 | 2 | 3 | 4 | 5 | 6;

  const toggleCollapse = () => {
    updateAttributes({ collapsed: !collapsed });
  };

  const Tag = `h${level}` as any;

  return (
    <NodeViewWrapper className="heading-wrapper relative group" style={{ display: 'flex', alignItems: 'center' }}>
      <button
        contentEditable={false}
        onClick={toggleCollapse}
        className="absolute -left-6 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer select-none"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <NodeViewContent as={Tag} className="m-0 flex-1" />
    </NodeViewWrapper>
  );
};

export const CollapsibleHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      collapsed: {
        default: true,
        parseHTML: element => {
          return element.getAttribute('data-collapsed') !== 'false';
        },
        renderHTML: attributes => {
          return { 'data-collapsed': attributes.collapsed };
        },
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingNodeView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('headingFolding'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(_tr, _oldState, _oldEditorState, newEditorState) {
            const decorations: Decoration[] = [];
            let isFolding = false;
            let currentFoldLevel = 0;

            newEditorState.doc.forEach((node, offset) => {
              if (node.type.name === 'heading') {
                if (node.attrs.collapsed) {
                  isFolding = true;
                  currentFoldLevel = node.attrs.level;
                } else {
                  if (node.attrs.level <= currentFoldLevel) {
                    isFolding = false;
                  }
                }
              } else {
                if (isFolding) {
                  decorations.push(
                    Decoration.node(offset, offset + node.nodeSize, {
                      style: 'display: none;',
                      class: 'hidden-by-fold'
                    })
                  );
                }
              }
            });

            return DecorationSet.create(newEditorState.doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});

export const DocumentNote: React.FC<DocumentNoteProps> = ({ documentId, initialNote, sections }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousImagesRef = useRef<string[]>([]);

  const getInitialContent = () => {
    if (initialNote) {
      // 既存のノートがある場合も、デフォルトで閉じた状態にするために、h2にdata-collapsed="true"を追加するような処理を入れることもできますが、
      // 今回は CollapsibleHeading の default: true と parseHTML で対応しています。
      return initialNote;
    }
    if (sections && sections.length > 0) {
      return sections.map(sec => `<h2 data-collapsed="true">${sec.title}</h2><p></p>`).join('');
    }
    return '<h2 data-collapsed="true">ノート</h2><p></p>';
  };

  const handleAutoSave = useCallback((content: string) => {
    setSaveMessage('保存中...');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

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
    }, 1000);
  }, [documentId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      CollapsibleHeading,
      Underline,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CustomBulletListInputRule,
      CustomBulletListShortcut,
      Extension.create({
        name: 'imageUploadExtension',
        addProseMirrorPlugins() {
          return [ImageUploadPlugin(() => setIsUploading(true), () => setIsUploading(false))];
        },
      }),
    ],
    content: getInitialContent(),
    editorProps: {
      attributes: {
        // Tailwind Typography でチェックリストが綺麗に表示されるように調整
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-5 pl-8 bg-white rounded-lg border border-gray-200 font-sans text-gray-800 prose-p:leading-relaxed prose-li:leading-relaxed prose-p:my-1 prose-li:my-0 prose-ul:my-2 prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0 prose-img:rounded-xl prose-img:shadow-sm prose-img:my-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      // 画像の削除検知とStorageからの削除
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const currentImages = Array.from(tempDiv.querySelectorAll('img')).map(img => img.src);
      
      const deletedImages = previousImagesRef.current.filter(src => !currentImages.includes(src));
      
      if (deletedImages.length > 0) {
        deletedImages.forEach(async (src) => {
          try {
            const urlObj = new URL(src);
            const pathSegments = urlObj.pathname.split('/');
            const fileName = pathSegments[pathSegments.length - 1];
            if (fileName) {
              await supabase.storage.from('note_images').remove([fileName]);
              console.log(`Deleted image from storage: ${fileName}`);
            }
          } catch (err) {
            console.error('Failed to delete image:', err);
          }
        });
      }
      
      previousImagesRef.current = currentImages;

      handleAutoSave(html);
    },
  });

  // 初回マウント時に、初期コンテンツ内の画像URLを抽出してセットする
  useEffect(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = getInitialContent();
    const imgs = Array.from(tempDiv.querySelectorAll('img')).map(img => img.src);
    previousImagesRef.current = imgs;
  }, [initialNote, sections]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="mb-8 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm relative">
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
          <div className="mb-3 text-xs text-gray-500 flex flex-wrap gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <span>💡 箇条書き: <kbd className="px-1 py-0.5 bg-gray-100 rounded border">・</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded border">Enter</kbd></span>
            <span>💡 チェックリスト: <kbd className="px-1 py-0.5 bg-gray-100 rounded border">[ ]</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded border">スペース</kbd></span>
            <span>💡 画像: コピペ または ドラッグ＆ドロップ</span>
            <span>💡 太字: <kbd className="px-1 py-0.5 bg-gray-100 rounded border">Ctrl+B</kbd></span>
          </div>
          
          <div className="relative">
            <EditorContent editor={editor} />
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-lg border border-gray-200 z-10">
                <div className="flex items-center gap-2 text-blue-600 font-bold bg-white px-4 py-2 rounded-full shadow-md">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  画像をアップロード中...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
