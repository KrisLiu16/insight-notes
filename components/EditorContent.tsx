import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckSquare, Clipboard, Clock, Code, FileText, Heading2, ListTodo, Minus, Quote, Sigma, Table } from 'lucide-react';
import { Note, NoteStats, ViewMode } from '../types';
import TagEditor from './TagEditor';
import MarkdownPreview from './MarkdownPreview';

interface EditorContentProps {
  activeNote: Note;
  viewMode: ViewMode;
  stats: NoteStats;
  lastSaved: number;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  markdownTheme?: 'classic' | 'serif' | 'night';
}

const EditorContent: React.FC<EditorContentProps> = ({ activeNote, viewMode, stats, lastSaved, onUpdateNote, markdownTheme = 'classic' }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

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

  const insertSnippet = (wrapperStart: string, wrapperEnd = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const value = ta.value;
    const { start, end } = selection;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + wrapperStart + selected + wrapperEnd + value.slice(end);
    onUpdateNote(activeNote.id, { content: next });
    setTimeout(() => {
      const pos = start + wrapperStart.length + selected.length + wrapperEnd.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }, 0);
    setContextMenu(prev => ({ ...prev, visible: false }));
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

  const menuItems = [
    {
      label: '复制选中',
      icon: <Clipboard size={14} />,
      onClick: copySelection,
      disabled: selection.start === selection.end,
    },
    {
      label: '插入标题 H2',
      icon: <Heading2 size={14} />,
      onClick: () => insertSnippet('## '),
    },
    {
      label: '插入待办列表',
      icon: <ListTodo size={14} />,
      onClick: () => insertSnippet('- [ ] '),
    },
    {
      label: '插入代码块',
      icon: <Code size={14} />,
      onClick: () => insertSnippet('```\n', '\n```'),
    },
    {
      label: '插入引用',
      icon: <Quote size={14} />,
      onClick: () => insertSnippet('> '),
    },
    {
      label: '插入分隔线',
      icon: <Minus size={14} />,
      onClick: () => insertSnippet('\n\n---\n\n'),
    },
    {
      label: '插入复选框',
      icon: <CheckSquare size={14} />,
      onClick: () => insertSnippet('- [ ] '),
    },
    {
      label: '插入表格',
      icon: <Table size={14} />,
      onClick: () => insertSnippet('| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n'),
    },
    {
      label: '插入公式 (块)',
      icon: <Sigma size={14} />,
      onClick: () => insertSnippet('$$\n', '\n$$'),
    },
    {
      label: '插入公式 (行内)',
      icon: <Sigma size={14} />,
      onClick: () => insertSnippet('$', '$'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
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
            onSelect={updateSelection}
            onClick={updateSelection}
            onKeyUp={updateSelection}
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
          className={`
            h-full overflow-y-auto custom-scrollbar bg-white transition-all duration-300 ease-in-out
            ${viewMode === 'view' ? 'w-full' : ''}
            ${viewMode === 'split' ? 'w-1/2 bg-slate-50/30' : ''}
            ${viewMode === 'edit' ? 'w-0 hidden' : ''}
          `}
        >
          <div className={`max-w-3xl mx-auto min-h-full ${viewMode === 'split' ? 'p-6 md:p-8' : 'p-8 md:p-16'}`}>
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
              <MarkdownPreview content={activeNote.content} theme={markdownTheme} />
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
        </div>
        <div className="flex items-center gap-4">
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
