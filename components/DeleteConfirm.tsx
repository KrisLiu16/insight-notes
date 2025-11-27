import React from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface DeleteConfirmProps {
  open: boolean;
  noteTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ open, noteTitle, onCancel, onConfirm, loading }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <AlertTriangle className="text-amber-500" size={18} />
            删除笔记
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-600 space-y-2">
          <p>确定要删除 <span className="font-semibold text-slate-900">“{noteTitle || '未命名'}”</span> 吗？</p>
          <p className="text-slate-400 text-xs">此操作不可恢复，请谨慎操作。</p>
        </div>
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-white border border-slate-200 text-sm font-medium transition-colors">
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirm;
