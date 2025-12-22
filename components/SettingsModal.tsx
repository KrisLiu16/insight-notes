import React, { useEffect, useRef, useState } from 'react';
import { Cpu, Download, Palette, RefreshCw, Save, Server, Settings, Sparkles, Upload, User, X } from 'lucide-react';
import { AppSettings } from '../types';
import { DEFAULT_ANALYZE_PROMPT, DEFAULT_POLISH_PROMPT } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, onExportData, onImportData }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setFormData(settings);
  }, [isOpen, settings]);

  const applyPreset = (provider: 'gemini' | 'openai' | 'deepseek' | 'ollama' | 'openai-mini' | 'openai-4-1' | 'claude' | 'qwen' | 'doubao') => {
    let update = {};
    switch (provider) {
      case 'gemini':
        update = { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash' };
        break;
      case 'doubao':
        update = { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'ep-20240604-xxxxxx-xxxxx' };
        break;
      case 'openai':
        update = { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
        break;
      case 'openai-mini':
        update = { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
        break;
      case 'openai-4-1':
        update = { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1' };
        break;
      case 'deepseek':
        update = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' };
        break;
      case 'ollama':
        update = { baseUrl: 'http://localhost:11434/v1', model: 'llama3', apiKey: 'ollama' };
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-600" size={22} />
            设置与偏好
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-50">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-6 gap-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            常规设置
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            AI 模型配置
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <label className="text-sm font-semibold text-slate-800 block mb-3 flex items-center gap-2">
                  <User size={16} /> 您的称呼
                </label>
                <input
                  type="text"
                  value={formData.userName || ''}
                  onChange={e => setFormData({ ...formData, userName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="例如：John Doe"
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Palette size={16} /> Markdown 渲染样式
                  </label>
                  <span className="text-[11px] text-slate-400">预览区样式</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'classic', label: '经典', desc: '简洁白底、代码行号' },
                    { key: 'serif', label: '书卷', desc: '衬线、纸感背景' },
                    { key: 'pastel', label: '柔彩', desc: '粉彩渐变、轻盈' },
                    { key: 'paper', label: '纸质', desc: '书本纸张、复古' },
                    { key: 'mono', label: '极客 · Mono', desc: '等宽字体、清爽' },
                    { key: 'terminal', label: '终端 · 夜', desc: '暗色终端、霓虹' },
                    { key: 'night', label: '夜间', desc: '深色、霓虹代码' },
                    { key: 'contrast', label: '高对比', desc: '暗色、高饱和' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setFormData({ ...formData, markdownTheme: item.key as AppSettings['markdownTheme'] })}
                      className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all min-w-[150px] ${
                        formData.markdownTheme === item.key
                          ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                    >
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-[11px] text-slate-500">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Download size={16} /> 数据备份 / 导入
                  </label>
                  <span className="text-[11px] text-slate-400">笔记 + 配置 JSON</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={onExportData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20"
                  >
                    <Download size={16} />
                    导出 JSON
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-200 hover:text-blue-600 transition-colors bg-white"
                  >
                    <Upload size={16} />
                    导入并覆盖
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) onImportData(file);
                      if (e.target.value) e.target.value = '';
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400">导入会覆盖当前笔记与设置，请先导出备份。</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">快捷键</label>
                  <span className="text-[11px] text-slate-400">Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                  {[
                    { key: 'Cmd/Ctrl + K', desc: '全局搜索 / 命令面板' },
                    { key: 'Cmd/Ctrl + S', desc: '保存' },
                    { key: 'Cmd/Ctrl + Shift + P', desc: '打开导出' },
                    { key: 'Cmd/Ctrl + Enter', desc: 'AI 润色' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="font-mono text-xs text-slate-700">{item.key}</span>
                      <span className="text-[13px] text-slate-500">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">快速预设 (Presets)</label>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => applyPreset('gemini')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">Gemini</button>
                  <button onClick={() => applyPreset('doubao')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">Doubao (豆包)</button>
                  <button onClick={() => applyPreset('deepseek')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">DeepSeek</button>
                  <button onClick={() => applyPreset('openai')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">OpenAI 4o-mini</button>
                  <button onClick={() => applyPreset('openai-4-1')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">OpenAI 4.1</button>
                  <button onClick={() => applyPreset('openai-mini')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">OpenAI mini</button>
                  <button onClick={() => applyPreset('claude')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">Claude 3.7</button>
                  <button onClick={() => applyPreset('qwen')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">Qwen Plus</button>
                  <button onClick={() => applyPreset('ollama')} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">Ollama (Local)</button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-2 flex items-center gap-2">
                    <Server size={16} /> Base URL (接口地址)
                  </label>
                  <input
                    type="text"
                    value={formData.baseUrl || ''}
                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-600"
                    placeholder="https://generativelanguage.googleapis.com/v1beta/openai/"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-2 flex items-center gap-2">
                    <Cpu size={16} /> Model Name (模型名称)
                  </label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-600"
                    placeholder="gemini-2.0-flash"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800 block mb-2 flex items-center gap-2">
                    <Sparkles size={16} /> API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-600"
                    placeholder="sk-..."
                  />
                  <div className="mt-2 text-xs text-slate-400">Key 仅保存在本地配置，不会被上传。</div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Prompts Settings</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-800">分析提示词 (Analyze)</label>
                    <button onClick={() => setFormData({ ...formData, customAnalyzePrompt: DEFAULT_ANALYZE_PROMPT })} className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1">
                      <RefreshCw size={12} /> 恢复默认
                    </button>
                  </div>
                  <textarea
                    value={formData.customAnalyzePrompt || ''}
                    onChange={e => setFormData({ ...formData, customAnalyzePrompt: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-xs min-h-[80px] resize-y font-mono bg-white"
                    placeholder={DEFAULT_ANALYZE_PROMPT}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-800">润色提示词 (Polish)</label>
                    <button onClick={() => setFormData({ ...formData, customPolishPrompt: DEFAULT_POLISH_PROMPT })} className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1">
                      <RefreshCw size={12} /> 恢复默认
                    </button>
                  </div>
                  <textarea
                    value={formData.customPolishPrompt || ''}
                    onChange={e => setFormData({ ...formData, customPolishPrompt: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-xs min-h-[80px] resize-y font-mono bg-white"
                    placeholder={DEFAULT_POLISH_PROMPT}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium">
            取消
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-600/30 transition-all text-sm font-medium flex items-center gap-2 transform active:scale-95"
          >
            <Save size={16} />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
