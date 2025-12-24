import React, { useEffect, useRef } from 'react';
import { ArrowUp, Bot, Clipboard, Eraser, Loader2, MessageSquare, Sparkles, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  modelName?: string;
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
  modelName,
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      // Focus input when opened
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[120] md:hidden"
          onClick={onClose}
        />
      )}
      
      <div
        className={`fixed inset-y-0 right-0 z-[125] w-full md:w-[480px] bg-white shadow-2xl border-l border-slate-100 transform transition-transform duration-300 ease-out flex flex-col h-full ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Bot size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                AI 助手
                {modelName && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium border border-slate-200">
                    {modelName}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                在线
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors group relative"
              title="新对话"
            >
              <Eraser size={18} />
              <span className="absolute top-full right-0 mt-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                清除上下文
              </span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Context Bar */}
        {(noteTitle || onInsertContext) && (
          <div className="px-5 py-2 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500 overflow-hidden">
              <span className="shrink-0 font-medium text-slate-400">当前引用</span>
              {noteTitle && (
                <span className="px-2 py-1 rounded bg-white border border-slate-200 truncate max-w-[180px]">
                  {noteTitle}
                </span>
              )}
            </div>
            {onInsertContext && (
              <button
                onClick={onInsertContext}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors font-medium"
              >
                <Sparkles size={12} />
                引用当前笔记
              </button>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth custom-scrollbar bg-[#fafafa]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-0 animate-in fade-in duration-700 slide-in-from-bottom-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-100 to-violet-50 text-indigo-500 flex items-center justify-center mb-6 shadow-sm">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">有什么可以帮您？</h3>
              <p className="text-sm text-slate-500 max-w-[240px] leading-relaxed">
                您可以询问关于笔记的问题，或者让我帮您编辑、总结内容。
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm border ${
                msg.role === 'assistant' 
                  ? 'bg-white border-slate-100 text-indigo-600' 
                  : 'bg-indigo-600 border-indigo-600 text-white'
              }`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>

              {/* Message Bubble */}
              <div className={`relative max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                <div className={`px-4 py-3 shadow-sm text-[14px] leading-relaxed overflow-hidden ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-slate-100 rounded-2xl rounded-tl-sm text-slate-700'
                    : 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                }`}>
                   {msg.role === 'assistant' ? (
                    <>
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        className="absolute -top-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 text-white shadow-sm"
                      >
                        <Clipboard size={10} /> 复制
                      </button>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isBlock = !!match || String(children).includes('\n');
                            
                            if (!isBlock) {
                              return <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-slate-200" {...props}>{children}</code>;
                            }
                            
                            return (
                              <div className="my-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-500 font-mono flex justify-between">
                                  <span>{match?.[1] || 'code'}</span>
                                </div>
                                <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-700 bg-white" {...props}>
                                  {children}
                                </pre>
                              </div>
                            );
                          },
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{children}</a>,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-500 my-2">{children}</blockquote>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-slate-100 text-indigo-600 flex items-center justify-center shadow-sm">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500 font-medium">正在思考...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className={`relative bg-slate-50 rounded-2xl border transition-all duration-200 ${
            loading ? 'border-slate-100 opacity-60' : 'border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/50'
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  onSend();
                }
              }}
              disabled={loading}
              placeholder="输入问题..."
              className="w-full bg-transparent border-none text-sm text-slate-800 placeholder:text-slate-400 focus:ring-0 p-3.5 pr-12 min-h-[52px] max-h-32 resize-none custom-scrollbar"
              rows={1}
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} />}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 text-center mt-2">
            AI 生成内容仅供参考，请核实重要信息
          </div>
        </div>
      </div>
    </>
  );
};

export default AiChatPanel;
