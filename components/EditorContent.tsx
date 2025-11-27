import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckSquare, Clipboard, Clock, FileText, Heading2, Image, ListTodo, Minus, Quote } from 'lucide-react';
import { MarkdownTheme, Note, NoteStats, ViewMode } from '../types';
import TagEditor from './TagEditor';
import MarkdownPreview from './MarkdownPreview';

interface EditorContentProps {
  activeNote: Note;
  viewMode: ViewMode;
  stats: NoteStats;
  lastSaved: number;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  markdownTheme?: MarkdownTheme;
  isReadOnly?: boolean;
}

const EditorContent: React.FC<EditorContentProps> = ({ activeNote, viewMode, stats, lastSaved, onUpdateNote, markdownTheme = 'classic', isReadOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [insertHint, setInsertHint] = useState<string>('');

  const attachmentsSize = useMemo(() => {
    if (!activeNote.attachments) return 0;
    return Object.values(activeNote.attachments).reduce((acc, dataUrl) => acc + Math.max(0, dataUrl.length * 0.75 - 22), 0);
  }, [activeNote.attachments]);

  useEffect(() => {
    const hideMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', hideMenu);
    return () => window.removeEventListener('click', hideMenu);
  }, []);

  const updateSelection = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    setSelection({ start: ta.selectionStart || 0, end: ta.selectionEnd || 0 });
  };

  const getSelectionRange = () => {
    const ta = textareaRef.current;
    return {
      start: ta?.selectionStart ?? selection.start,
      end: ta?.selectionEnd ?? selection.end,
    };
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

  const insertTextAtSelection = (text: string, extraUpdates: Partial<Note> = {}) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = getSelectionRange();
    ta.setRangeText(text, start, end, 'end');
    const next = ta.value;
    onUpdateNote(activeNote.id, { content: next, ...extraUpdates });
    const pos = ta.selectionEnd;
    setSelection({ start: pos, end: pos });
    ta.focus();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const insertSnippet = (wrapperStart: string, wrapperEnd = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const value = ta.value;
    const { start, end } = selection;
    const selected = value.slice(start, end);
    insertTextAtSelection(wrapperStart + selected + wrapperEnd);
  };

  const copySelection = async () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = selection;
    const selected = ta.value.slice(start, end);
    if (!selected) return;
    await navigator.clipboard.writeText(selected);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const createAttachmentId = () => `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const readAsDataUrl = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const insertImageFile = async (file: File) => {
    const compressed = await compressImage(file);
    const dataUrl = await readAsDataUrl(compressed);
    const { start, end } = getSelectionRange();
    const selectionText = activeNote.content.slice(start, end).trim();
    const alt = selectionText || file.name.replace(/\.[^/.]+$/, '') || 'image';
    const attachmentId = createAttachmentId();
    const attachments = { ...(activeNote.attachments || {}), [attachmentId]: dataUrl };
    insertTextAtSelection(`![${alt}](attachment:${attachmentId})`, { attachments });
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    updateSelection();
    const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    try {
      await insertImageFile(file);
    } catch (err) {
      console.error('Failed to paste image', err);
    }
  };

  const pasteFromClipboard = async () => {
    updateSelection();
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

  const menuItems = [
    {
      label: '复制选中',
      icon: <Clipboard size={14} />,
      onClick: copySelection,
      disabled: selection.start === selection.end,
    },
    {
      label: '粘贴',
      icon: <Clipboard size={14} />,
      onClick: pasteFromClipboard,
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
    {
      label: '插入复选框',
      icon: <CheckSquare size={14} />,
      onClick: () => insertSnippet('- [ ] '),
      disabled: isReadOnly,
    },
  ];

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

      <div className="flex-1 flex relative overflow-hidden bg-white" onContextMenu={e => e.preventDefault()}>
        <div
          className={`
            h-full flex flex-col transition-all duration-300 ease-in-out
            ${viewMode === 'edit' ? 'w-full' : ''}
            ${viewMode === 'split' ? 'w-1/2 border-r border-slate-100' : ''}
            ${viewMode === 'view' ? 'w-0 hidden' : ''}
          `}
        >
          <textarea
            ref={textareaRef}
            value={activeNote.content}
            onChange={e => onUpdateNote(activeNote.id, { content: e.target.value })}
            readOnly={isReadOnly}
            onSelect={updateSelection}
            onClick={updateSelection}
            onKeyUp={updateSelection}
            onScroll={() => {
              const ta = textareaRef.current;
              const pv = previewRef.current;
              if (ta && pv && pv.scrollHeight > pv.clientHeight) {
                const ratio = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
                pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
              }
            }}
            onPaste={handlePaste}
            onContextMenu={e => {
              e.preventDefault();
              updateSelection();
              setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
            }}
            className="flex-1 w-full h-full p-6 md:p-8 resize-none outline-none font-mono text-sm leading-relaxed text-slate-800 bg-transparent custom-scrollbar"
            placeholder="# 开始你的创作..."
          />
        </div>

        <div
          ref={previewRef}
          className={`
            h-full overflow-y-auto custom-scrollbar bg-white transition-all duration-300 ease-in-out
            ${viewMode === 'view' ? 'w-full' : ''}
            ${viewMode === 'split' ? 'w-1/2 bg-slate-50/30' : ''}
            ${viewMode === 'edit' ? 'w-0 hidden' : ''}
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
              <MarkdownPreview content={activeNote.content} attachments={activeNote.attachments} theme={markdownTheme} showToc={viewMode === 'view'} />
            </div>
          </div>
        </div>

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
