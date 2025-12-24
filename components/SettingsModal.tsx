import React, { useEffect, useRef, useState } from 'react';
import { Cpu, Download, Eye, EyeOff, Key, Palette, RefreshCw, Save, Server, Settings, Sparkles, Upload, User, X, GitBranch, FolderCog, Database, FileCode, HelpCircle } from 'lucide-react';
import { AppSettings, Note } from '../types';
import { DEFAULT_ANALYZE_PROMPT, DEFAULT_POLISH_PROMPT, DEFAULT_MERGE_SUMMARY_PROMPT, DEFAULT_GIT_IGNORE_PATTERNS } from '../services/storage';
import PromptImportExportModal from './PromptImportExportModal';
import { createHelpNote } from '../services/help';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onOpenMigration: () => void;
  onCreateNote: (note: Note) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onOpenMigration, onCreateNote }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'git'>('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setFormData(settings);
  }, [isOpen, settings]);

  const applyPreset = (provider: 'gemini' | 'openai' | 'deepseek' | 'ollama' | 'openai-mini' | 'openai-o1' | 'claude' | 'qwen' | 'doubao') => {
    let update = {};
    switch (provider) {
      case 'gemini':
        update = { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash' };
        break;
      case 'doubao':
        update = { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'ep-20240604-xxxxxx-xxxxx' };
        break;
      case 'openai':
        update = { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
        break;
      case 'openai-mini':
        update = { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
        break;
      case 'openai-o1':
        update = { baseUrl: 'https://api.openai.com/v1', model: 'o1-mini' };
        break;
      case 'deepseek':
        update = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' };
        break;
      case 'ollama':
        update = { baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', apiKey: 'ollama' };
        break;
      case 'claude':
        update = { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-7-sonnet-20250219' };
        break;
      case 'qwen':
        update = { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' };
        break;
      default:
        update = {};
    }
    setFormData({ ...formData, ...update });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-slate-400" size={20} />
            设置与偏好
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-50">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-50 px-6 gap-8 bg-white/50 backdrop-blur-sm sticky top-[61px] z-10">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            常规设置
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            AI 模型配置
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'git' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Git 设置
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <section className="space-y-3">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profile</h3>
                <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-3 p-3">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={20} />
                     </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 font-medium block mb-1">您的称呼</label>
                        <input
                          type="text"
                          value={formData.userName || ''}
                          onChange={e => setFormData({ ...formData, userName: e.target.value })}
                          className="w-full text-sm font-medium text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                          placeholder="例如：John Doe"
                        />
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appearance</h3>
                  <span className="text-[10px] text-slate-400">Markdown 渲染样式</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'classic', label: '经典', desc: '简洁白底' },
                    { key: 'serif', label: '书卷', desc: '衬线纸感' },
                    { key: 'github', label: 'Github', desc: 'GitHub 风格' },
                    { key: 'paper', label: '纸质', desc: '复古纹理' },
                    { key: 'mono', label: '极客', desc: '等宽清爽' },
                    { key: 'terminal', label: '终端', desc: '暗色霓虹' },
                    { key: 'night', label: '夜间', desc: '深色护眼' },
                    { key: 'contrast', label: '高对比', desc: '极简黑白' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setFormData({ ...formData, markdownTheme: item.key as AppSettings['markdownTheme'] })}
                      className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                        formData.markdownTheme === item.key
                          ? 'border-slate-800 bg-slate-800 text-white shadow-md transform scale-[1.02]'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={`text-[10px] ${formData.markdownTheme === item.key ? 'text-slate-300' : 'text-slate-400'}`}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Management</h3>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Save size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">备份与恢复</div>
                        <div className="text-xs text-slate-400">导出 JSON 包含所有笔记和设置</div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button
                        onClick={onOpenMigration}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                      >
                        <Database size={14} /> 数据迁移 (导入/导出)
                      </button>
                   </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Help & Support</h3>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <HelpCircle size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">使用指南</div>
                        <div className="text-xs text-slate-400">生成一份详细的 Insight Notes 功能手册</div>
                      </div>
                   </div>
                   <button
                      onClick={() => onCreateNote(createHelpNote())}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors"
                   >
                      生成文档
                   </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Presets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                     { id: 'gemini', name: 'Gemini 2.0 Flash' },
                     { id: 'deepseek', name: 'DeepSeek V3' },
                     { id: 'openai', name: 'GPT-4o' },
                     { id: 'openai-mini', name: 'GPT-4o mini' },
                     { id: 'openai-o1', name: 'OpenAI o1-mini' },
                     { id: 'claude', name: 'Claude 3.7' },
                     { id: 'doubao', name: 'Doubao (豆包)' },
                     { id: 'ollama', name: 'Local (Llama 3.2)' },
                  ].map((preset: any) => (
                    <button 
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)} 
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 bg-white hover:border-slate-800 hover:bg-slate-800 hover:text-white transition-all text-sm text-slate-600 shadow-sm text-left group"
                    >
                      <span className="font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration</h3>
                 <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                       <Server size={18} className="text-slate-400" />
                       <div className="flex-1">
                          <label className="text-xs text-slate-500 font-medium block mb-1">Base URL</label>
                          <input
                            type="text"
                            value={formData.baseUrl || ''}
                            onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                            className="w-full text-sm font-mono text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                            placeholder="https://api.openai.com/v1"
                          />
                       </div>
                    </div>
                    <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                       <Cpu size={18} className="text-slate-400" />
                       <div className="flex-1">
                          <label className="text-xs text-slate-500 font-medium block mb-1">Model Name</label>
                          <input
                            type="text"
                            value={formData.model || ''}
                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                            className="w-full text-sm font-mono text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                            placeholder="gpt-4o-mini"
                          />
                       </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                       <Key size={18} className="text-slate-400" />
                       <div className="flex-1 relative">
                          <label className="text-xs text-slate-500 font-medium block mb-1">API Key</label>
                          <div className="flex items-center">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={formData.apiKey}
                              onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                              className="w-full text-sm font-mono text-slate-700 bg-transparent outline-none placeholder:text-slate-300 pr-8"
                              placeholder="sk-..."
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                            >
                              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                       </div>
                    </div>
                 </div>
                 <p className="text-[10px] text-slate-400 px-1">您的 API Key 仅存储在本地浏览器中，绝不会发送给我们的服务器。</p>
              </section>

              <section className="space-y-3">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prompts Engineering</h3>
                    <button 
                      onClick={() => setShowPromptManager(true)}
                      className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <FolderCog size={14} /> 管理提示词
                    </button>
                 </div>
                 <div className="grid gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                             <Sparkles size={14} className="text-indigo-500"/> 分析 (Analyze)
                          </div>
                          <button onClick={() => setFormData({ ...formData, customAnalyzePrompt: DEFAULT_ANALYZE_PROMPT })} className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                            <RefreshCw size={10} /> 重置
                          </button>
                       </div>
                       <textarea
                          value={formData.customAnalyzePrompt || ''}
                          onChange={e => setFormData({ ...formData, customAnalyzePrompt: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-600 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-50 outline-none transition-all resize-y min-h-[80px]"
                          placeholder={DEFAULT_ANALYZE_PROMPT}
                        />
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                             <Palette size={14} className="text-pink-500"/> 编辑 (Polish)
                          </div>
                          <button onClick={() => setFormData({ ...formData, customPolishPrompt: DEFAULT_POLISH_PROMPT })} className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                            <RefreshCw size={10} /> 重置
                          </button>
                       </div>
                       <textarea
                          value={formData.customPolishPrompt || ''}
                          onChange={e => setFormData({ ...formData, customPolishPrompt: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-600 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-50 outline-none transition-all resize-y min-h-[120px]"
                          placeholder={DEFAULT_POLISH_PROMPT}
                        />
                    </div>
                 </div>
              </section>
            </div>
          )}

          {activeTab === 'git' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <section className="space-y-3">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Git Ignore Settings</h3>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex justify-between items-center mb-1">
                       <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <FileCode size={14} className="text-orange-500"/> 忽略文件名单 (Ignore List)
                       </div>
                       <button onClick={() => setFormData({ ...formData, gitIgnorePatterns: DEFAULT_GIT_IGNORE_PATTERNS })} className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                         <RefreshCw size={10} /> 重置
                       </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">这些文件将不会包含在 Git 汇报生成的 Diff 上下文中。每行一个文件名。</p>
                    <textarea
                       value={formData.gitIgnorePatterns || ''}
                       onChange={e => setFormData({ ...formData, gitIgnorePatterns: e.target.value })}
                       className="w-full p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-mono text-slate-600 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-50 outline-none transition-all resize-y min-h-[200px]"
                       placeholder={DEFAULT_GIT_IGNORE_PATTERNS}
                     />
                 </div>
              </section>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-50 bg-white flex justify-end gap-3 z-10">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium">
            取消
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all text-sm font-medium flex items-center gap-2 active:scale-95"
          >
            <Save size={16} />
            保存变更
          </button>
        </div>
      </div>
      
      <PromptImportExportModal
        isOpen={showPromptManager}
        onClose={() => setShowPromptManager(false)}
        currentPrompts={{
          analyze: formData.customAnalyzePrompt || DEFAULT_ANALYZE_PROMPT,
          polish: formData.customPolishPrompt || DEFAULT_POLISH_PROMPT,
          merge: formData.customMergePrompt || DEFAULT_MERGE_SUMMARY_PROMPT,
        }}
        onImport={(prompts) => {
          setFormData(prev => ({
            ...prev,
            customAnalyzePrompt: prompts.analyze ?? prev.customAnalyzePrompt,
            customPolishPrompt: prompts.polish ?? prev.customPolishPrompt,
            customMergePrompt: prompts.merge ?? prev.customMergePrompt,
          }));
        }}
      />
    </div>
  );
};

export default SettingsModal;
