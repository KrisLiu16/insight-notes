import React from 'react';
import { Check, ChevronRight, Columns, Copy, Download, Edit3, Eye, Fingerprint, List, Loader2, Lock, MessageSquare, PenTool, Redo2, Sidebar, Sparkles, Undo2, Unlock } from 'lucide-react';
import { Note, ViewMode } from '../types';
import { useState } from 'react';

interface EditorToolbarProps {
  activeNote: Note;
  viewMode: ViewMode;
  isSidebarOpen: boolean;
  isNoteListOpen: boolean;
  isAiAnalyzing: boolean;
  isAiPolishing: boolean;
  isCopied: boolean;
  isReadOnly: boolean;
  onToggleSidebar: () => void;
  onToggleNoteList: () => void;
  onBack: () => void;
  onTitleChange: (value: string) => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onAnalyze: () => void;
  onPolish: () => void;
  onCopy: () => void;
  onExport: () => void;
  onToggleChat: () => void;
  onToggleReadOnly: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const IdBadge = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-[10px] font-mono text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200"
      title="点击复制笔记 ID"
    >
      <Fingerprint size={12} />
      <span>{id}</span>
      {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="opacity-50" />}
    </button>
  );
};

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeNote,
  viewMode,
  isSidebarOpen,
  isNoteListOpen,
  isAiAnalyzing,
  isAiPolishing,
  isCopied,
  isReadOnly,
  onToggleSidebar,
  onToggleNoteList,
  onBack,
  onTitleChange,
  onChangeViewMode,
  onAnalyze,
  onPolish,
  onCopy,
  onExport,
  onToggleChat,
  onToggleReadOnly,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => (
  <div className="h-16 px-4 md:px-6 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-md z-20 shrink-0">
    <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
      {!isSidebarOpen && (
        <button
          onClick={onToggleSidebar}
          className="text-slate-400 hover:text-blue-600 hidden md:block p-2 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
          title="展开侧边栏 (Sidebar)"
        >
          <Sidebar size={20} />
        </button>
      )}

      {!isNoteListOpen && (
        <button
          onClick={onToggleNoteList}
          className="text-slate-400 hover:text-blue-600 hidden md:block p-2 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
          title="展开笔记列表 (List)"
        >
          <List size={20} />
        </button>
      )}

      {(!isSidebarOpen || !isNoteListOpen) && <div className="h-5 w-px bg-slate-200 hidden md:block mx-1" />}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 md:hidden p-1">
        <ChevronRight size={24} className="rotate-180" />
      </button>

      {viewMode !== 'view' ? (
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={activeNote.title}
            onChange={e => onTitleChange(e.target.value)}
            className="text-lg md:text-xl font-bold text-slate-800 border-none outline-none focus:ring-0 bg-transparent w-full placeholder-slate-300 truncate font-sans"
            placeholder="无标题笔记"
          />
          <IdBadge id={activeNote.id} />
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-lg md:text-xl font-bold text-slate-800 truncate">{activeNote.title}</span>
          <IdBadge id={activeNote.id} />
        </div>
      )}
    </div>

    <div className="flex items-center gap-2 md:gap-3">
      <div className="bg-slate-100 p-1 rounded-lg flex items-center hidden sm:flex">
        <button
          onClick={() => onChangeViewMode('edit')}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          title="仅编辑"
        >
          <PenTool size={16} />
        </button>
        <button
          onClick={() => onChangeViewMode('split')}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'split' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          title="双栏对比"
        >
          <Columns size={16} />
        </button>
        <button
          onClick={() => onChangeViewMode('view')}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'view' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          title="仅预览"
        >
          <Eye size={16} />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-200 hidden sm:block" />

      <div className="flex items-center gap-1">
        <button
          onClick={onAnalyze}
          disabled={isAiAnalyzing}
          className={`flex items-center justify-center p-2 rounded-lg text-xs font-medium transition-all ${
            isAiAnalyzing ? 'text-purple-600 bg-purple-50' : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50'
          }`}
          title="AI 分析"
        >
          {isAiAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        </button>

        <button
          onClick={onPolish}
          disabled={isAiPolishing}
          className={`flex items-center justify-center p-2 rounded-lg text-xs font-medium transition-all ${
            isAiPolishing ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
          title="AI 润色"
        >
          {isAiPolishing ? <Loader2 size={18} className="animate-spin" /> : <Edit3 size={18} />}
        </button>
      </div>

      <button
        onClick={onToggleChat}
        className="p-2 rounded-lg transition-colors text-slate-400 hover:text-blue-600 hover:bg-blue-50"
        title="AI 对话"
      >
        <MessageSquare size={18} />
      </button>

      <button
        onClick={onCopy}
        className={`p-2 rounded-lg transition-colors ${isCopied ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        title="复制笔记源码"
      >
        {isCopied ? <Check size={18} /> : <Copy size={18} />}
      </button>

      <button onClick={onExport} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors" title="导出 Markdown">
        <Download size={18} />
      </button>

      <button
        onClick={onToggleReadOnly}
        className={`p-2 rounded-lg transition-colors ${isReadOnly ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        title={isReadOnly ? '取消只读 (允许编辑)' : '切换只读模式'}
      >
        {isReadOnly ? <Lock size={18} /> : <Unlock size={18} />}
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${canUndo ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}
          title="撤销 (Ctrl/Cmd+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${canRedo ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}
          title="前进 (Ctrl/Cmd+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>
      </div>
    </div>
  </div>
);

export default EditorToolbar;
