import React, { useState, useRef } from 'react';
import { X, Download, Upload, Check, FileJson } from 'lucide-react';
import { saveFile } from '../services/saveFile';

interface PromptMap {
  analyze: string;
  polish: string;
  merge: string;
}

interface PromptImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompts: PromptMap;
  onImport: (prompts: Partial<PromptMap>) => void;
}

const PROMPT_LABELS: Record<keyof PromptMap, string> = {
  analyze: '分析 (Analyze)',
  polish: '编辑 (Polish)',
  merge: 'Git 汇报 (Merge Summary)',
};

const PromptImportExportModal: React.FC<PromptImportExportModalProps> = ({ isOpen, onClose, currentPrompts, onImport }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedExportKeys, setSelectedExportKeys] = useState<Set<keyof PromptMap>>(new Set(['analyze', 'polish', 'merge']));
  const [importData, setImportData] = useState<Partial<PromptMap> | null>(null);
  const [selectedImportKeys, setSelectedImportKeys] = useState<Set<keyof PromptMap>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleToggleExport = (key: keyof PromptMap) => {
    const next = new Set(selectedExportKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedExportKeys(next);
  };

  const handleExport = async () => {
    const exportObj: Partial<PromptMap> = {};
    selectedExportKeys.forEach(key => {
      exportObj[key] = currentPrompts[key];
    });

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    await saveFile(blob, { suggestedName: 'insight-notes-prompts.json', mime: 'application/json' });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const validKeys: Partial<PromptMap> = {};
        const keysFound = new Set<keyof PromptMap>();

        if (typeof json.analyze === 'string') { validKeys.analyze = json.analyze; keysFound.add('analyze'); }
        if (typeof json.polish === 'string') { validKeys.polish = json.polish; keysFound.add('polish'); }
        if (typeof json.merge === 'string') { validKeys.merge = json.merge; keysFound.add('merge'); }

        if (Object.keys(validKeys).length === 0) {
          alert('未在文件中找到有效的提示词配置');
          return;
        }

        setImportData(validKeys);
        setSelectedImportKeys(keysFound);
      } catch (err) {
        alert('文件解析失败，请确保是有效的 JSON 文件');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleImport = (key: keyof PromptMap) => {
    const next = new Set(selectedImportKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedImportKeys(next);
  };

  const handleConfirmImport = () => {
    if (!importData) return;
    const finalImport: Partial<PromptMap> = {};
    selectedImportKeys.forEach(key => {
      if (importData[key]) finalImport[key] = importData[key];
    });
    onImport(finalImport);
    onClose();
    setImportData(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileJson size={18} className="text-indigo-500" />
            提示词配置管理
          </h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'export' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            导出配置
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            导入配置
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">选择需要导出的提示词模板：</p>
              <div className="space-y-2">
                {(Object.keys(PROMPT_LABELS) as Array<keyof PromptMap>).map(key => (
                  <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedExportKeys.has(key) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                      {selectedExportKeys.has(key) && <Check size={12} />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedExportKeys.has(key)}
                      onChange={() => handleToggleExport(key)}
                    />
                    <span className="text-sm font-medium text-slate-700">{PROMPT_LABELS[key]}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleExport}
                disabled={selectedExportKeys.size === 0}
                className="w-full mt-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                <Download size={16} /> 导出选中项 ({selectedExportKeys.size})
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {!importData ? (
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/10 hover:text-indigo-600 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className="opacity-50" />
                  <span className="text-sm font-medium">点击上传 JSON 配置文件</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">发现以下配置，请选择要覆盖的项目：</p>
                    <button onClick={() => { setImportData(null); setSelectedImportKeys(new Set()); }} className="text-xs text-red-500 hover:underline">重新上传</button>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(importData).map((k) => {
                      const key = k as keyof PromptMap;
                      return (
                        <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedImportKeys.has(key) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                            {selectedImportKeys.has(key) && <Check size={12} />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={selectedImportKeys.has(key)}
                            onChange={() => handleToggleImport(key)}
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-700">{PROMPT_LABELS[key]}</span>
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{importData[key]?.slice(0, 50)}...</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleConfirmImport}
                    disabled={selectedImportKeys.size === 0}
                    className="w-full mt-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200"
                  >
                    <Check size={16} /> 确认覆盖 ({selectedImportKeys.size})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptImportExportModal;
