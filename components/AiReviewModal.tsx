import React from 'react';
import { Check, Sparkles, Tag, X } from 'lucide-react';
import { Note } from '../types';

interface AnalyzeResult {
  summary?: string;
  tags: string[];
}

interface AiReviewModalProps {
  open: boolean;
  mode: 'analyze' | 'polish';
  original: Note | null;
  polishedContent?: string;
  analyzeResult?: AnalyzeResult;
  onCancel: () => void;
  onConfirm: () => void;
}

const AiReviewModal: React.FC<AiReviewModalProps> = ({ open, mode, original, polishedContent, analyzeResult, onCancel, onConfirm }) => {
  if (!open || !original) return null;

  const renderAnalyze = () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          AI 生成摘要
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 min-h-[60px]">
          {analyzeResult?.summary || '无摘要'}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <Tag size={16} className="text-blue-500" />
          AI 生成标签
        </p>
        <div className="flex flex-wrap gap-2">
          {(analyzeResult?.tags || []).map(tag => (
            <span key={tag} className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs">
              #{tag}
            </span>
          ))}
          {(analyzeResult?.tags || []).length === 0 && <span className="text-xs text-slate-400">无标签</span>}
        </div>
      </div>
    </div>
  );

  const renderPolish = () => (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">原文</div>
        <pre className="p-3 text-xs text-slate-700 whitespace-pre-wrap bg-white max-h-[40vh] overflow-auto custom-scrollbar">{original.content}</pre>
      </div>
      <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-700">编辑结果</div>
        <pre className="p-3 text-xs text-slate-800 whitespace-pre-wrap bg-white max-h-[40vh] overflow-auto custom-scrollbar">{polishedContent}</pre>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Sparkles size={18} className="text-indigo-500" />
            {mode === 'analyze' ? '应用 AI 分析结果？' : '应用 AI 润色结果？'}
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {mode === 'analyze' ? renderAnalyze() : renderPolish()}
        </div>
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-white border border-slate-200 text-sm font-medium transition-colors">
            取消
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold flex items-center gap-2 shadow-sm">
            <Check size={16} />
            确认应用
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiReviewModal;
