import React, { useState, useEffect } from 'react';
import { X, GitBranch, Folder, RefreshCw, FileText, Loader2, Play, Globe } from 'lucide-react';
import { getGitConfigUser, getRecentMerges, getMergeDiff, getGitRemoteUrl, parseGitUrl, GitMerge } from '../services/git';
import { generateGitSummary } from '../services/gemini';
import { AppSettings } from '../types';

interface GitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

const GitReportModal: React.FC<GitReportModalProps> = ({ isOpen, onClose, settings }) => {
  const [repoPath, setRepoPath] = useState('');
  const [gitUser, setGitUser] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [parsedRepoName, setParsedRepoName] = useState<string | null>(null);
  const [merges, setMerges] = useState<GitMerge[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMerge, setSelectedMerge] = useState<GitMerge | null>(null);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && !repoPath) {
      // Could auto-detect or load last used path here
    }
  }, [isOpen]);

  const handleSelectDir = async () => {
    // 检查 window.desktop 是否存在
    if (typeof window.desktop !== 'undefined') {
      const path = await window.desktop.selectDirectory();
      if (path) {
        setRepoPath(path);
        loadRepoInfo(path);
      }
    } else {
      alert('请在桌面端应用中使用此功能');
    }
  };

  const loadRepoInfo = async (path: string) => {
    setLoading(true);
    try {
      const user = await getGitConfigUser(path);
      setGitUser(user);
      
      const url = await getGitRemoteUrl(path);
      setRepoUrl(url);
      setParsedRepoName(url ? parseGitUrl(url) : null);

      const recentMerges = await getRecentMerges(path, 50);
      setMerges(recentMerges);
    } catch (e) {
      console.error(e);
      alert('加载 Git 信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedMerge || !repoPath) return;
    setGenerating(true);
    try {
      const diff = await getMergeDiff(repoPath, selectedMerge.hash);
      if (!diff) {
        setSummary('该 Merge 没有产生 Diff（可能是空合并或已被包含）。');
        return;
      }
      const context = `Repository: ${parsedRepoName || repoUrl || 'Unknown'}\nRemote URL: ${repoUrl || 'N/A'}\nCommit Message: ${selectedMerge.message}\nAuthor: ${selectedMerge.author}\nDate: ${selectedMerge.date}\nCurrent Git User: ${gitUser}`;
      const result = await generateGitSummary(diff, context, settings.apiKey, settings.baseUrl, settings.model);
      setSummary(result);
    } catch (err: any) {
      setSummary('生成失败: ' + (err.message || err));
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="text-blue-600" size={20} />
            Git 工作汇报生成器
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar: Config & Merges */}
          <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50 shrink-0">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={repoPath} 
                  readOnly 
                  placeholder="请选择仓库路径"
                  className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-600 truncate cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={handleSelectDir}
                />
                <button 
                  onClick={handleSelectDir}
                  className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                  title="选择文件夹"
                >
                  <Folder size={14} />
                </button>
              </div>
              {gitUser && (
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>当前 Git 用户:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[120px]" title={gitUser}>{gitUser}</span>
                </div>
              )}
              {parsedRepoName && (
                <div className="text-xs text-slate-500 flex justify-between items-center gap-2">
                  <span className="shrink-0">远程仓库:</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <Globe size={10} />
                    <span className="font-medium text-slate-700 truncate max-w-[140px]" title={repoUrl || ''}>
                      {parsedRepoName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase">最近 Merge 记录</h3>
                <button 
                  onClick={() => repoPath && loadRepoInfo(repoPath)} 
                  className="text-slate-400 hover:text-blue-600"
                  title="刷新"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-1">
                  {merges.map(merge => (
                    <button
                      key={merge.hash}
                      onClick={() => setSelectedMerge(merge)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                        selectedMerge?.hash === merge.hash 
                          ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100' 
                          : 'border-transparent hover:bg-slate-200/50 text-slate-700'
                      }`}
                    >
                      <div className={`font-medium mb-1 line-clamp-2 ${selectedMerge?.hash === merge.hash ? 'text-blue-700' : 'text-slate-800'}`}>
                        {merge.message}
                      </div>
                      <div className="flex justify-between items-center opacity-70 text-[10px]">
                        <span>{new Date(merge.date).toLocaleDateString()}</span>
                        <span className="bg-slate-200/50 px-1 rounded">{merge.author}</span>
                      </div>
                    </button>
                  ))}
                  {merges.length === 0 && repoPath && !loading && (
                    <div className="text-center text-xs text-slate-400 py-8">未找到 Merge 记录</div>
                  )}
                  {!repoPath && (
                    <div className="text-center text-xs text-slate-400 py-8">请先选择仓库</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main: Summary */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
             {selectedMerge ? (
               <div className="h-full flex flex-col">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                   <div className="flex items-start justify-between gap-4">
                     <div>
                       <h3 className="text-xl font-bold text-slate-800 mb-2">{selectedMerge.message}</h3>
                       <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                         <span className="flex items-center gap-1"><GitBranch size={14} /> {selectedMerge.hash.substring(0, 7)}</span>
                         <span>Author: {selectedMerge.author}</span>
                         <span>Date: {new Date(selectedMerge.date).toLocaleString()}</span>
                       </div>
                     </div>
                     <button
                       onClick={handleGenerate}
                       disabled={generating}
                       className="shrink-0 flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:translate-y-0.5"
                     >
                       {generating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                       {generating ? '正在分析 Diff...' : '生成汇报'}
                     </button>
                   </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                   {summary ? (
                     <div className="prose prose-slate max-w-none">
                       <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase mb-4 pb-2 border-b border-slate-100">
                         <FileText size={16} />
                         AI 生成汇报
                       </h4>
                       <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                         {summary}
                       </div>
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 rounded-lg border-2 border-dashed border-slate-100 m-4">
                       <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-200">
                         <FileText size={32} />
                       </div>
                       <p className="font-medium">准备就绪</p>
                       <p className="text-sm opacity-70 mt-1">点击右上角按钮，基于 Git Diff 生成智能汇报</p>
                     </div>
                   )}
                 </div>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <GitBranch size={40} className="opacity-20" />
                 </div>
                 <p className="text-lg font-medium text-slate-500">选择一个 Merge 记录开始</p>
                 <p className="text-sm opacity-60 mt-2 max-w-xs text-center">选择左侧列表中的合并提交，我们将分析其变更内容并生成总结。</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitReportModal;
