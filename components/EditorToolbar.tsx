import React from 'react';
import { Check, ChevronRight, Columns, Copy, Download, Edit3, Eye, Fingerprint, List, Loader2, Maximize2, Minimize2, MessageSquare, PenTool, Sidebar, Sparkles } from 'lucide-react';
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
  isFullScreen: boolean;
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
  onToggleFullScreen: () => void;
  
}

const IdBadge = ({ id, title }: { id: string; title: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const textToCopy = `[${title || '未命名笔记'}](${id})`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Fallback copy failed', e);
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-[10px] font-mono text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200"
      title="点击复制笔记链接 (Markdown格式)"
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
  isFullScreen,
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
  onToggleFullScreen,
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
          <IdBadge id={activeNote.id} title={activeNote.title} />
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-lg md:text-xl font-bold text-slate-800 truncate">{activeNote.title}</span>
          <IdBadge id={activeNote.id} title={activeNote.title} />
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
          title="AI 编辑"
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
        onClick={onToggleFullScreen}
        className={`p-2 rounded-lg transition-colors ${isFullScreen ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        title={isFullScreen ? '退出全屏 (恢复编辑)' : '全屏阅读'}
      >
        {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>

      
    </div>
  </div>
);

export default EditorToolbar;
