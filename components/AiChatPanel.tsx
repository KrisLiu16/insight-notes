import React, { useEffect, useRef } from 'react';
import { ArrowRight, Loader2, MessageSquare, X } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onClose: () => void;
  onNewChat: () => void;
  onInsertContext?: () => void;
  noteTitle?: string;
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({
  open,
  messages,
  input,
  loading,
  onInputChange,
  onSend,
  onClose,
  onNewChat,
  onInsertContext,
  noteTitle,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  return (
    <div
      className={`fixed inset-y-0 right-0 z-[125] w-full max-w-md bg-gradient-to-b from-white via-slate-50 to-slate-100 shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      } flex flex-col h-full`}
    >
      <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur sticky top-0">
        <div className="flex items-center gap-3 text-slate-800 font-semibold">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 ring-4 ring-purple-100/40">
            <MessageSquare size={16} />
          </div>
          <div className="leading-tight space-y-0.5">
            <div>AI 对话</div>
            <div className="text-[11px] text-slate-500 font-normal flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Live</span>
              <span>Chat-style · 浮动气泡</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:text-blue-600 transition-colors"
            title="开启新对话"
          >
            新对话
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors" title="关闭">
            <X size={16} />
          </button>
        </div>
      </div>

      {(noteTitle || onInsertContext) && (
        <div className="px-4 pt-3 pb-2 bg-white/80 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          {noteTitle && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 truncate">引用：{noteTitle}</span>}
          {onInsertContext && (
            <button
              onClick={onInsertContext}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs shadow-sm hover:brightness-110 transition-colors"
            >
              引用当前笔记
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_40%)] pointer-events-none" />

        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500 shadow-sm text-center relative z-10">
            和 AI 开始对话吧
          </div>
        )}

        <div className="space-y-4 relative z-10">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-300/50">
                  AI
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-lg ${
                  msg.role === 'assistant'
                    ? 'bg-white/95 border border-slate-100 text-slate-800 shadow-slate-200/70 backdrop-blur-sm'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-blue-500/30'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-2xl bg-white text-slate-700 flex items-center justify-center font-semibold shadow-lg border border-slate-200">你</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-300/50">
                AI
              </div>
              <div className="bg-white/95 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 shadow-sm flex items-center gap-2 backdrop-blur-sm">
                <Loader2 size={16} className="animate-spin" />
                正在思考…
              </div>
            </div>
          )}
        </div>
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-slate-100 bg-white/90 backdrop-blur shadow-inner">
        <div className="flex items-end gap-2 bg-white/90 border border-slate-200 rounded-2xl p-2 shadow-lg shadow-slate-200/60">
          <textarea
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            className="flex-1 min-h-[64px] max-h-32 resize-none rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 custom-scrollbar"
            placeholder="Shift+Enter 换行，Enter 发送"
            disabled={loading}
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="h-[60px] w-12 flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 disabled:opacity-60 transition-colors shadow-lg shadow-blue-500/30"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChatPanel;
