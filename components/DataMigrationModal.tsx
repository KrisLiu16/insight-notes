import React, { useState, useRef, useMemo } from 'react';
import { Download, Upload, X, Check, FileJson, Settings, FileText, ChevronRight, ChevronDown, Search, AlertCircle, Database } from 'lucide-react';
import { AppSettings, Note } from '../types';
import { saveFile } from '../services/saveFile';
import { generateId } from '../services/storage';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  currentNotes: Note[];
  onImport: (data: { settings?: Partial<AppSettings>; notes?: Note[] }, strategy: 'overwrite' | 'keep_both' | 'skip') => void;
}

type ExportSection = 'settings_global' | 'settings_ai' | 'settings_prompts' | 'notes';

const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentNotes,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Export States
  const [exportSections, setExportSections] = useState<Set<ExportSection>>(new Set(['settings_global', 'settings_ai', 'settings_prompts', 'notes']));
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set(currentNotes.map(n => n.id)));
  const [noteSearch, setNoteSearch] = useState('');
  const [expandNotes, setExpandNotes] = useState(true);

  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [importSections, setImportSections] = useState<Set<string>>(new Set());
  const [importNoteStrategy, setImportNoteStrategy] = useState<'overwrite' | 'keep_both' | 'skip'>('keep_both');
  const [importSelectedNoteIds, setImportSelectedNoteIds] = useState<Set<string>>(new Set());
  const [importNoteSearch, setImportNoteSearch] = useState('');
  const [expandImportNotes, setExpandImportNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredExportNotes = useMemo(() => {
    if (!noteSearch) return currentNotes;
    const q = noteSearch.toLowerCase();
    return currentNotes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [currentNotes, noteSearch]);

  const filteredImportNotes = useMemo(() => {
    if (!parsedData?.notes) return [];
    if (!importNoteSearch) return parsedData.notes;
    const q = importNoteSearch.toLowerCase();
    return parsedData.notes.filter((n: any) => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
  }, [parsedData, importNoteSearch]);

  if (!isOpen) return null;

  // --- Export Logic ---
  
  const handleToggleExportSection = (section: ExportSection) => {
    const next = new Set(exportSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExportSections(next);
  };

  const handleToggleNoteSelection = (id: string) => {
    const next = new Set(selectedNoteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNoteIds(next);
  };

  const handleSelectAllNotes = () => {
    if (selectedNoteIds.size === filteredExportNotes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(filteredExportNotes.map(n => n.id)));
    }
  };

  const handleToggleImportNoteSelection = (id: string) => {
    const next = new Set(importSelectedNoteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setImportSelectedNoteIds(next);
  };

  const handleSelectAllImportNotes = () => {
    if (!parsedData?.notes) return;
    if (importSelectedNoteIds.size === filteredImportNotes.length) {
      setImportSelectedNoteIds(new Set());
    } else {
      setImportSelectedNoteIds(new Set(filteredImportNotes.map((n: any) => String(n.id))));
    }
  };

  const executeExport = async () => {
    const payload: any = {
      version: 'zhishi-v1',
      exportedAt: new Date().toISOString(),
      settings: {},
      notes: [],
    };

    if (exportSections.has('settings_global')) {
      payload.settings.userName = currentSettings.userName;
      payload.settings.markdownTheme = currentSettings.markdownTheme;
      payload.settings.sortBy = currentSettings.sortBy;
      payload.settings.sortOrder = currentSettings.sortOrder;
    }
    if (exportSections.has('settings_ai')) {
      payload.settings.apiKey = currentSettings.apiKey;
      payload.settings.baseUrl = currentSettings.baseUrl;
      payload.settings.model = currentSettings.model;
    }
    if (exportSections.has('settings_prompts')) {
      payload.settings.customAnalyzePrompt = currentSettings.customAnalyzePrompt;
      payload.settings.customPolishPrompt = currentSettings.customPolishPrompt;
      payload.settings.customMergePrompt = currentSettings.customMergePrompt;
    }

    if (exportSections.has('notes')) {
      payload.notes = currentNotes.filter(n => selectedNoteIds.has(n.id));
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    await saveFile(blob, { suggestedName: `insight-backup-${new Date().toISOString().slice(0, 10)}.json`, mime: 'application/json' });
    onClose();
  };

  // --- Import Logic ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setParsedData(json);
        // Default select all available sections
        const sections = new Set<string>();
        if (json.settings) {
            if (json.settings.userName || json.settings.markdownTheme) sections.add('settings_global');
            if (json.settings.apiKey || json.settings.baseUrl) sections.add('settings_ai');
            if (json.settings.customAnalyzePrompt || json.settings.customPolishPrompt) sections.add('settings_prompts');
        }
        // if (json.notes && Array.isArray(json.notes) && json.notes.length > 0) sections.add('notes');
        setImportSections(sections);
        
        // Default select all notes
        if (json.notes && Array.isArray(json.notes)) {
           setImportSelectedNoteIds(new Set(json.notes.map((n: any) => String(n.id))));
        } else {
           setImportSelectedNoteIds(new Set());
        }
      } catch (err) {
        alert('无效的 JSON 文件');
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (!parsedData) return;

    const settingsUpdate: Partial<AppSettings> = {};
    if (importSections.has('settings_global')) {
        if (parsedData.settings?.userName) settingsUpdate.userName = parsedData.settings.userName;
        if (parsedData.settings?.markdownTheme) settingsUpdate.markdownTheme = parsedData.settings.markdownTheme;
        if (parsedData.settings?.sortBy) settingsUpdate.sortBy = parsedData.settings.sortBy;
        if (parsedData.settings?.sortOrder) settingsUpdate.sortOrder = parsedData.settings.sortOrder;
    }
    if (importSections.has('settings_ai')) {
        if (parsedData.settings?.apiKey) settingsUpdate.apiKey = parsedData.settings.apiKey;
        if (parsedData.settings?.baseUrl) settingsUpdate.baseUrl = parsedData.settings.baseUrl;
        if (parsedData.settings?.model) settingsUpdate.model = parsedData.settings.model;
    }
    if (importSections.has('settings_prompts')) {
        if (parsedData.settings?.customAnalyzePrompt) settingsUpdate.customAnalyzePrompt = parsedData.settings.customAnalyzePrompt;
        if (parsedData.settings?.customPolishPrompt) settingsUpdate.customPolishPrompt = parsedData.settings.customPolishPrompt;
        if (parsedData.settings?.customMergePrompt) settingsUpdate.customMergePrompt = parsedData.settings.customMergePrompt;
    }

    let notesToImport: Note[] = [];
    if (parsedData.notes && Array.isArray(parsedData.notes)) {
        notesToImport = parsedData.notes
            .filter((n: any) => importSelectedNoteIds.has(String(n.id)))
            .map((n: any) => ({
                ...n,
                id: n.id && /^\d{9,10}$/.test(String(n.id)) ? String(n.id) : generateId()
            }));
    }

    onImport({ settings: settingsUpdate, notes: notesToImport }, importNoteStrategy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database size={20} className="text-indigo-600" />
            数据迁移 (Data Migration)
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'export' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Download size={16} /> 导出备份
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'import' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={16} /> 导入恢复
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
          
          {/* --- EXPORT TAB --- */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                   <Settings size={16} className="text-slate-500" />
                   <span className="font-semibold text-sm text-slate-700">配置项 (Settings)</span>
                </div>
                <div className="p-2 space-y-1">
                  {[
                    { id: 'settings_global', label: '常规设置 (Global)', desc: '用户名、主题、排序偏好' },
                    { id: 'settings_ai', label: 'AI 模型配置 (AI Config)', desc: 'API Key, Base URL, Model Name' },
                    { id: 'settings_prompts', label: '自定义提示词 (Prompts)', desc: '分析、润色、Git 汇报模板' },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${exportSections.has(item.id as ExportSection) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-300'}`}>
                        {exportSections.has(item.id as ExportSection) && <Check size={12} />}
                      </div>
                      <input type="checkbox" className="hidden" checked={exportSections.has(item.id as ExportSection)} onChange={() => handleToggleExportSection(item.id as ExportSection)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-700">{item.label}</div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                <div 
                  className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => setExpandNotes(!expandNotes)}
                >
                   <div className="flex items-center gap-2">
                     <FileText size={16} className="text-slate-500" />
                     <span className="font-semibold text-sm text-slate-700">笔记文档 (Notes)</span>
                     <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{selectedNoteIds.size} / {filteredExportNotes.length}</span>
                   </div>
                   {expandNotes ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
                
                {expandNotes && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-3 border-b border-slate-100 flex gap-2">
                       <div className="relative flex-1">
                         <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                         <input 
                           type="text" 
                           placeholder="搜索笔记..." 
                           value={noteSearch}
                           onChange={e => setNoteSearch(e.target.value)}
                           className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-300 transition-colors"
                         />
                       </div>
                       <button onClick={handleSelectAllNotes} className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                         {selectedNoteIds.size === filteredExportNotes.length ? '全不选' : '全选'}
                       </button>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredExportNotes.length > 0 ? filteredExportNotes.map(note => (
                        <label key={note.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedNoteIds.has(note.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-300'}`}>
                            {selectedNoteIds.has(note.id) && <Check size={10} />}
                          </div>
                          <input type="checkbox" className="hidden" checked={selectedNoteIds.has(note.id)} onChange={() => handleToggleNoteSelection(note.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate">{note.title || 'Untitled'}</div>
                            <div className="text-[10px] text-slate-400 truncate">{new Date(note.updatedAt).toLocaleDateString()} · {note.tags.join(', ') || 'No tags'}</div>
                          </div>
                        </label>
                      )) : (
                        <div className="text-center py-8 text-xs text-slate-400">未找到笔记</div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* --- IMPORT TAB --- */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {!parsedData ? (
                 <div 
                   className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-indigo-500 hover:bg-indigo-50/10 hover:text-indigo-600 transition-all cursor-pointer bg-white"
                   onClick={() => fileInputRef.current?.click()}
                 >
                   <div className="p-4 bg-slate-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                     <Upload size={32} className="opacity-50 group-hover:text-indigo-600" />
                   </div>
                   <div className="text-center">
                     <span className="text-sm font-medium block">点击上传 JSON 备份文件</span>
                     <span className="text-xs text-slate-400 mt-1 block">支持 insight-backup-*.json 格式</span>
                   </div>
                   <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                 </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <FileJson size={20} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-800">已解析备份文件</h4>
                      <p className="text-xs text-blue-600 mt-1">
                        包含 {parsedData.notes?.length || 0} 篇笔记，以及相关配置信息。
                        <br />导出时间: {parsedData.exportedAt ? new Date(parsedData.exportedAt).toLocaleString() : 'Unknown'}
                      </p>
                      <button onClick={() => { setParsedData(null); setImportFile(null); }} className="text-xs text-blue-700 underline mt-2 hover:text-blue-900">重新上传</button>
                    </div>
                  </div>

                  {parsedData.notes && parsedData.notes.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">笔记冲突处理策略</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'keep_both', label: '保留两者', desc: '新导入笔记将生成新 ID' },
                          { id: 'overwrite', label: '覆盖现有', desc: '相同 ID 的笔记将被覆盖' },
                          { id: 'skip', label: '跳过重复', desc: '相同 ID 的笔记将不导入' },
                        ].map((opt) => (
                          <div 
                            key={opt.id}
                            onClick={() => setImportNoteStrategy(opt.id as any)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${importNoteStrategy === opt.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                          >
                            <div className="text-xs font-bold text-slate-700 mb-1">{opt.label}</div>
                            <div className="text-[10px] text-slate-500">{opt.desc}</div>
                          </div>
                        ))}
                      </div>
                      {importNoteStrategy === 'overwrite' && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                          <AlertCircle size={14} />
                          <span>警告：覆盖操作不可撤销，建议先导出当前备份。</span>
                        </div>
                      )}
                    </section>
                  )}

                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">选择导入内容</h4>
                    <div className="space-y-2">
                       {[
                         { id: 'settings_global', label: '常规设置', disabled: !parsedData.settings?.userName && !parsedData.settings?.markdownTheme },
                         { id: 'settings_ai', label: 'AI 配置 (API Key 等)', disabled: !parsedData.settings?.apiKey },
                         { id: 'settings_prompts', label: '自定义提示词', disabled: !parsedData.settings?.customAnalyzePrompt },
                       ].map(item => (
                         <label key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${item.disabled ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-indigo-300 cursor-pointer'}`}>
                           <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${importSections.has(item.id) && !item.disabled ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                             {importSections.has(item.id) && !item.disabled && <Check size={12} />}
                           </div>
                           <input 
                             type="checkbox" 
                             className="hidden" 
                             checked={importSections.has(item.id)} 
                             onChange={() => {
                               if (item.disabled) return;
                               const next = new Set(importSections);
                               if (next.has(item.id)) next.delete(item.id);
                               else next.add(item.id);
                               setImportSections(next);
                             }} 
                             disabled={item.disabled}
                           />
                           <span className="text-sm font-medium text-slate-700">{item.label}</span>
                         </label>
                       ))}
                    </div>
                  </section>

                  {parsedData.notes && parsedData.notes.length > 0 && (
                    <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                        <div 
                        className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                        onClick={() => setExpandImportNotes(!expandImportNotes)}
                        >
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-slate-500" />
                            <span className="font-semibold text-sm text-slate-700">笔记文档 (Import Notes)</span>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{importSelectedNoteIds.size} / {filteredImportNotes.length}</span>
                        </div>
                        {expandImportNotes ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                        </div>
                        
                        {expandImportNotes && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="p-3 border-b border-slate-100 flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                type="text" 
                                placeholder="搜索笔记..." 
                                value={importNoteSearch}
                                onChange={e => setImportNoteSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-300 transition-colors"
                                />
                            </div>
                            <button onClick={handleSelectAllImportNotes} className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                {importSelectedNoteIds.size === filteredImportNotes.length ? '全不选' : '全选'}
                            </button>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {filteredImportNotes.length > 0 ? filteredImportNotes.map((note: any) => (
                                <label key={note.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${importSelectedNoteIds.has(String(note.id)) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-300'}`}>
                                    {importSelectedNoteIds.has(String(note.id)) && <Check size={10} />}
                                </div>
                                <input type="checkbox" className="hidden" checked={importSelectedNoteIds.has(String(note.id))} onChange={() => handleToggleImportNoteSelection(String(note.id))} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-slate-700 truncate">{note.title || 'Untitled'}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : 'Unknown Date'} · {note.tags ? note.tags.join(', ') : 'No tags'}</div>
                                </div>
                                </label>
                            )) : (
                                <div className="text-center py-8 text-xs text-slate-400">未找到笔记</div>
                            )}
                            </div>
                        </div>
                        )}
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 z-10">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium">
            取消
          </button>
          {activeTab === 'export' ? (
            <button
              onClick={executeExport}
              disabled={exportSections.size === 0 && selectedNoteIds.size === 0}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all text-sm font-medium flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              确认导出
            </button>
          ) : (
            <button
              onClick={executeImport}
              disabled={!parsedData || (importSections.size === 0 && importSelectedNoteIds.size === 0)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all text-sm font-medium flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              开始导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataMigrationModal;
