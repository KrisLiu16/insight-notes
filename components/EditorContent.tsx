import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { openSearchPanel } from '@codemirror/search';
import { Check, Clipboard, Clock, FileText, Heading2, Image, ListTodo, Minus, Quote } from 'lucide-react';
import { MarkdownTheme, Note, NoteStats, ViewMode } from '../types';
import { searchPanelTheme, searchLocalization } from './CodeMirrorTheme';
import TagEditor from './TagEditor';
import MarkdownPreview from './MarkdownPreview';
import BacklinksPanel from './BacklinksPanel';

interface EditorContentProps {
  activeNote: Note;
  allNotes: Note[];
  viewMode: ViewMode;
  stats: NoteStats;
  lastSaved: number;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  selection: { start: number; end: number };
  onSelectionChange: (start: number, end: number) => void;
  markdownTheme?: MarkdownTheme;
  isReadOnly?: boolean;
  onLinkClick?: (href: string) => void;
}

const EditorContent: React.FC<EditorContentProps> = ({
  activeNote,
  allNotes,
  viewMode,
  stats,
  lastSaved,
  onUpdateNote,
  selection,
  onSelectionChange,
  markdownTheme = 'classic',
  isReadOnly,
  onLinkClick,
}) => {
  const editorViewRef = useRef<EditorView | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [selectionState, setSelectionState] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [insertHint, setInsertHint] = useState<string>('');
  const [previewContent, setPreviewContent] = useState(activeNote.content);
  const [, startTransition] = useTransition();

  const attachmentsSize = useMemo(() => {
    if (!activeNote.attachments) return 0;
    return Object.values(activeNote.attachments).reduce((acc: number, dataUrl: string) => acc + Math.max(0, dataUrl.length * 0.75 - 22), 0);
  }, [activeNote.attachments]);

  // Force immediate update of preview content when activeNote.id changes to prevent stale content flash
  // This is a "derived state" pattern that updates state during render
  const [prevNoteId, setPrevNoteId] = useState(activeNote.id);
  if (activeNote.id !== prevNoteId) {
    setPrevNoteId(activeNote.id);
    setPreviewContent(activeNote.content);
  }

  useEffect(() => {
    const hideMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', hideMenu);
    return () => window.removeEventListener('click', hideMenu);
  }, []);

  // Removed useEffect(() => { setPreviewContent(activeNote.content); }, [activeNote.id]); 
  // because we handle it synchronously above.

  useEffect(() => {
    const idle = (window as any).requestIdleCallback;
    const cancelIdle = (window as any).cancelIdleCallback;
    let cleanup: (() => void) | undefined;

    const schedule = () => {
      if (idle) {
        const id = idle(() => startTransition(() => setPreviewContent(activeNote.content)), { timeout: 500 });
        cleanup = () => cancelIdle && cancelIdle(id);
        return;
      }
      const t = window.setTimeout(() => startTransition(() => setPreviewContent(activeNote.content)), 240);
      cleanup = () => window.clearTimeout(t);
    };

    schedule();
    return () => {
      if (cleanup) cleanup();
    };
  }, [activeNote.content, activeNote.id, startTransition]);

  useLayoutEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    const len = view.state.doc.length;
    const anchor = Math.min(selection.start, len);
    const head = Math.min(selection.end, len);
    view.dispatch({ selection: { anchor, head } });
    setSelectionState({ start: anchor, end: head });
  }, [activeNote.id, selection.start, selection.end]);

  useEffect(() => {
    const view = editorViewRef.current;
    const pv = previewRef.current;
    if (!view || !pv) return;

    // Remove the previous scroll synchronization
    // const onScroll = () => { ... }
    // const scroller = view.scrollDOM;
    // scroller.addEventListener('scroll', onScroll);
    // return () => scroller.removeEventListener('scroll', onScroll);
    
    // We do NOT want to sync scroll on every scroll event anymore.
    // We only want to sync when the user moves the cursor (click or arrow keys),
    // which is handled in handleEditorUpdate.
  }, [activeNote.id]);

  const createAttachmentId = () => `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const readAsDataUrl = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const insertImageFile = async (file: File, view?: EditorView) => {
    const targetView = view || editorViewRef.current;
    if (!targetView) return;
    const compressed = await compressImage(file);
    const dataUrl = await readAsDataUrl(compressed);
    const sel = targetView.state.selection.main;
    const selectionText = targetView.state.doc.sliceString(sel.from, sel.to).trim();
    const alt = selectionText || file.name.replace(/\.[^/.]+$/, '') || 'image';
    const attachmentId = createAttachmentId();
    const attachments = { ...(activeNote.attachments || {}), [attachmentId]: dataUrl };
    insertTextAtSelection(`![${alt}](attachment:${attachmentId})`, { attachments }, targetView);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    const maxDimension = 1600;
    const targetSize = 700 * 1024;
    const dataUrl = await readAsDataUrl(file);
    const img = document.createElement('img');
    img.src = dataUrl;
    await new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !img.width || !img.height) {
      return file;
    }
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const tryExport = (quality: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject()), 'image/jpeg', quality));
    let quality = 0.85;
    let blob = await tryExport(quality);
    if (blob.size > targetSize) {
      quality = 0.7;
      blob = await tryExport(quality);
    }
    return blob;
  };

  const insertTextAtSelection = (text: string, extraUpdates: Partial<Note> = {}, view?: EditorView) => {
    const targetView = view || editorViewRef.current;
    if (!targetView) return;
    const sel = targetView.state.selection.main;
    const from = sel.from;
    const to = sel.to;
    targetView.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
      scrollIntoView: true,
    });
    const next = targetView.state.doc.toString();
    onUpdateNote(activeNote.id, { content: next, ...extraUpdates });
    onSelectionChange(from + text.length, from + text.length);
    setSelectionState({ start: from + text.length, end: from + text.length });
    setContextMenu(prev => ({ ...prev, visible: false }));
    targetView.focus();
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await insertImageFile(file);
      setInsertHint(`图片已插入并压缩 (${Math.round(attachmentsSize / 1024)} KB 总占用)`);
      setTimeout(() => setInsertHint(''), 2500);
    } catch (err) {
      console.error('Failed to insert image', err);
    } finally {
      event.target.value = '';
    }
  };

  const triggerImagePicker = () => {
    fileInputRef.current?.click();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePasteMenu = async () => {
    try {
      if ((navigator.clipboard as any)?.read) {
        const items = await (navigator.clipboard as any).read();
        const imageItem = items.find((it: any) => it.types.some((t: string) => t.startsWith('image/')));
        if (imageItem) {
          const type = imageItem.types.find((t: string) => t.startsWith('image/'));
          const blob = await imageItem.getType(type);
          const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
          await insertImageFile(file);
          setInsertHint('已从剪贴板插入图片');
          setTimeout(() => setInsertHint(''), 2000);
          return;
        }
      }
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) insertTextAtSelection(text);
      }
    } catch (err) {
      console.error('Paste via menu failed', err);
    } finally {
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const copySelection = async () => {
    const view = editorViewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    const selected = view.state.doc.sliceString(sel.from, sel.to);
    if (!selected) return;
    await navigator.clipboard.writeText(selected);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const insertSnippet = (wrapperStart: string, wrapperEnd = '') => {
    const view = editorViewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    const selected = view.state.doc.sliceString(sel.from, sel.to);
    insertTextAtSelection(wrapperStart + selected + wrapperEnd, {}, view);
  };

  const menuItems = [
    {
      label: '复制选中',
      icon: <Clipboard size={14} />,
      onClick: copySelection,
      disabled: selectionState.start === selectionState.end,
    },
    {
      label: '粘贴',
      icon: <Clipboard size={14} />,
      onClick: handlePasteMenu,
      disabled: isReadOnly,
    },
    {
      label: '插入图片',
      icon: <Image size={14} />,
      onClick: triggerImagePicker,
      disabled: isReadOnly,
    },
    {
      label: '插入标题 H2',
      icon: <Heading2 size={14} />,
      onClick: () => insertSnippet('## '),
      disabled: isReadOnly,
    },
    {
      label: '插入待办列表',
      icon: <ListTodo size={14} />,
      onClick: () => insertSnippet('- [ ] '),
      disabled: isReadOnly,
    },
    {
      label: '插入引用',
      icon: <Quote size={14} />,
      onClick: () => insertSnippet('> '),
      disabled: isReadOnly,
    },
    {
      label: '插入分隔线',
      icon: <Minus size={14} />,
      onClick: () => insertSnippet('\n\n---\n\n'),
      disabled: isReadOnly,
    },
  ];

  const extensions = useMemo(() => {
    const pasteHandler = EditorView.domEventHandlers({
      paste: (event, view) => {
        if (isReadOnly) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
        if (!imageItem) return false;
        const file = imageItem.getAsFile();
        if (!file) return false;
        event.preventDefault();
        insertImageFile(file, view);
        return true;
      },
      contextmenu: e => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
        return true;
      },
    });

    const theme = EditorView.theme(
      {
        '&': { height: '100%', backgroundColor: 'transparent' },
        '.cm-scroller': { fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, Menlo, monospace', lineHeight: '1.6', padding: '24px' },
        '.cm-content': { caretColor: '#0f172a' },
        '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: '#cbd5e1' },
      },
      { dark: false },
    );

    return [
      theme,
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorState.tabSize.of(2),
      pasteHandler,
      searchPanelTheme,
      searchLocalization,
      keymap.of([{ key: "Mod-f", run: openSearchPanel }]),
    ];
  }, [isReadOnly, activeNote.id]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        const view = editorViewRef.current;
        if (view && view.hasFocus) {
           // Already focused, let CodeMirror handle it (via keymap)
           // But if we want to ensure browser search doesn't show up:
           e.preventDefault();
           openSearchPanel(view);
           return;
        }
        
        // If not focused, but we want to intercept Cmd+F to search in editor
        if (view && viewMode === 'edit') {
           e.preventDefault();
           view.focus();
           openSearchPanel(view);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [viewMode]);

  const handleEditorChange = (value: string, viewUpdate: ViewUpdate) => {
    onUpdateNote(activeNote.id, { content: value });
    const sel = viewUpdate.state.selection.main;
    setSelectionState({ start: sel.from, end: sel.to });
    onSelectionChange(sel.from, sel.to);
  };

  const handleEditorUpdate = (vu: ViewUpdate) => {
    // Handle cursor movement / selection change
    if (vu.selectionSet) {
      const sel = vu.state.selection.main;
      setSelectionState({ start: sel.from, end: sel.to });
      onSelectionChange(sel.from, sel.to);

      // Sync scroll to cursor position
      // Calculate cursor position percentage relative to the document
      const view = editorViewRef.current;
      const pv = previewRef.current;
      
      if (view && pv) {
        // Get line number of the cursor
        const lineBlock = view.lineBlockAt(sel.head);
        const docHeight = view.contentHeight;
        const windowHeight = view.scrollDOM.clientHeight;
        
        // Calculate scroll ratio based on cursor's vertical position in the document
        // We use the top of the line block as the reference point
        const cursorTop = lineBlock.top;
        
        // Simple ratio mapping: Cursor % in Editor -> Scroll % in Preview
        // (cursorTop / (docHeight - windowHeight)) * (pv.scrollHeight - pv.clientHeight)
        // Note: docHeight might be larger than scrollHeight in some implementations, but generally scrollHeight is safer.
        const scroller = view.scrollDOM;
        const scrollableHeight = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
        const previewScrollableHeight = Math.max(1, pv.scrollHeight - pv.clientHeight);
        
        // We want the cursor to be roughly in the same relative visual position, 
        // OR we can just map the cursor's absolute progress in the file.
        // Let's map absolute progress: "Cursor is at 50% of file -> Scroll preview to 50%"
        const ratio = Math.min(1, Math.max(0, cursorTop / scrollableHeight));
        
        // Smooth scroll to that position
        pv.scrollTo({ top: ratio * previewScrollableHeight, behavior: 'smooth' });
      }
    }
  };

  const validNoteIds = useMemo(() => allNotes.map(n => n.id), [allNotes]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      {viewMode !== 'view' && (
        <div className="px-4 md:px-6 py-2 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs shrink-0">
          <div className="flex items-center gap-2 group">
            <span className="font-semibold text-slate-500">分类:</span>
            <input
              type="text"
              value={activeNote.category || ''}
              onChange={e => onUpdateNote(activeNote.id, { category: e.target.value })}
              className="bg-transparent outline-none w-24 text-slate-700 placeholder-slate-400"
              placeholder="未分类"
            />
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <TagEditor tags={activeNote.tags} onChange={newTags => onUpdateNote(activeNote.id, { tags: newTags })} />
          </div>
        </div>
      )}

      <div className="flex-1 flex relative overflow-hidden bg-white">
        <div
          className={`
            h-full flex flex-col transition-all duration-300 ease-in-out
            ${viewMode === 'edit' ? 'w-full' : ''}
            ${viewMode === 'split' ? 'w-1/2 border-r border-slate-100' : ''}
            ${viewMode === 'view' ? 'w-0 hidden' : ''}
          `}
        >
          <div className="flex-1 h-full">
            <CodeMirror
              value={activeNote.content}
              height="100%"
              basicSetup={{ lineNumbers: true, highlightActiveLineGutter: false }}
              extensions={extensions}
              readOnly={isReadOnly}
              onCreateEditor={view => {
                editorViewRef.current = view;
              }}
              onChange={handleEditorChange}
              onUpdate={handleEditorUpdate}
              className="h-full"
              theme="light"
            />
          </div>
        </div>

        {viewMode !== 'edit' && (
          <div
            ref={previewRef}
            className={`
              h-full overflow-y-auto custom-scrollbar bg-white transition-all duration-300 ease-in-out
              ${viewMode === 'view' ? 'w-full' : ''}
              ${viewMode === 'split' ? 'w-1/2 bg-slate-50/30' : ''}
            `}
          >
            <div
              className={`${viewMode === 'view' ? 'max-w-6xl lg:max-w-5xl md:max-w-4xl' : 'max-w-3xl'} mx-auto min-h-full ${
                viewMode === 'split' ? 'p-6 md:p-8' : 'p-8 md:p-16'
              }`}
            >
              {viewMode === 'view' && (
                <div className="mb-10 text-center border-b border-slate-100 pb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">{activeNote.title}</h1>
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-500 font-medium">
                    <span className="bg-slate-100 px-3 py-1 rounded-full">{activeNote.category || '随笔'}</span>
                    <span>·</span>
                    <span>{new Date(activeNote.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {activeNote.tags.length > 0 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {activeNote.tags.map(tag => (
                        <span key={tag} className="text-blue-600 text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="blog-content">
                <MarkdownPreview 
                  // key={activeNote.id} // REMOVED: We want to reuse components (CodeBlock, Mermaid) to keep 'isLoaded' state
                  content={activeNote.content} 
                  attachments={activeNote.attachments} 
                  theme={markdownTheme} 
                  showToc={viewMode === 'view'} 
                  onLinkClick={onLinkClick} 
                  validNoteIds={validNoteIds}
                />
              </div>
            </div>
          </div>
        )}

        {contextMenu.visible && (
          <div
            className="fixed z-[130] bg-white shadow-2xl rounded-xl border border-slate-200 py-2 w-52 backdrop-blur-sm"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {menuItems.map(item => (
              <button
                key={item.label}
                disabled={item.disabled}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-8 bg-white border-t border-slate-100 flex items-center justify-between px-4 text-[10px] md:text-xs text-slate-400 shrink-0 select-none z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
            <FileText size={12} />
            {stats.words} 字 / {stats.chars} 字符
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors hidden sm:flex">
            <Clock size={12} />~{stats.readingTime} 分钟阅读
          </span>
          {attachmentsSize > 0 && (
            <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors hidden sm:flex">
              <Image size={12} />附件 {Math.round(attachmentsSize / 1024)} KB
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {insertHint && <span className="text-emerald-600">{insertHint}</span>}
          <span className="flex items-center gap-1.5">
            {lastSaved ? (
              <>
                <Check size={12} className="text-green-500" />
                已保存 {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              '未保存'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EditorContent;
