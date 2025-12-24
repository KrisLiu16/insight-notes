import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Menu, Plus } from 'lucide-react';
import { AppSettings, Note, NoteStats, ViewMode } from './types';
import { generateId, loadNotes, loadSettings, saveNotes, saveSettings } from './services/storage';
import { saveFile } from './services/saveFile';
import { chatWithAI, generateTagsAndSummary, polishContent } from './services/gemini';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import EditorToolbar from './components/EditorToolbar';
import EditorContent from './components/EditorContent';
import Logo from './components/Logo';
import DeleteConfirm from './components/DeleteConfirm';
import AiReviewModal from './components/AiReviewModal';
import AiChatPanel, { ChatMessage } from './components/AiChatPanel';
import ExportModal from './components/ExportModal';
import GitReportModal from './components/GitReportModal';
import DevToolsModal from './components/DevToolsModal';
import DataMigrationModal from './components/DataMigrationModal';

const EmptyState: React.FC<{ onCreateNote: () => void }> = ({ onCreateNote }) => (
  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 text-slate-400 animate-in fade-in duration-500">
    <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 mb-6 flex flex-col items-center max-w-sm text-center border border-slate-100 transform hover:-translate-y-1 transition-transform duration-500">
      <div className="bg-gradient-to-tr from-blue-50 to-indigo-50 p-6 rounded-2xl mb-6 ring-1 ring-blue-100">
        <BookOpen size={40} className="text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">开启创作之旅</h2>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed px-4">
        选择左侧笔记或创建一个新篇章。
        <br />
        按 <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 mx-1 text-slate-600">Cmd+K</kbd> 快速搜索。
      </p>
      <button
        onClick={onCreateNote}
        className="w-full bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        立即写作
      </button>
    </div>
  </div>
);

const App = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ apiKey: '', markdownTheme: 'classic' });
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNoteListOpen, setIsNoteListOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const isAiProcessingRef = useRef(false);
  const [aiElapsedTime, setAiElapsedTime] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [preFullScreenState, setPreFullScreenState] = useState<{ sidebar: boolean; noteList: boolean; viewMode: ViewMode } | null>(null);

  const handleToggleFullScreen = () => {
    if (isFullScreen) {
      // Exit full screen
      if (preFullScreenState) {
        setIsSidebarOpen(preFullScreenState.sidebar);
        setIsNoteListOpen(preFullScreenState.noteList);
        setViewMode(preFullScreenState.viewMode);
      } else {
        setIsSidebarOpen(true);
        setIsNoteListOpen(true);
        setViewMode('edit');
      }
      setIsFullScreen(false);
    } else {
      // Enter full screen
      setPreFullScreenState({ sidebar: isSidebarOpen, noteList: isNoteListOpen, viewMode });
      setIsSidebarOpen(false);
      setIsNoteListOpen(false);
      setViewMode('view');
      setIsFullScreen(true);
    }
  };

  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingAnalyze, setPendingAnalyze] = useState<{ tags: string[]; summary?: string } | null>(null);
  const [pendingPolish, setPendingPolish] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGitReportOpen, setIsGitReportOpen] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isDataMigrationOpen, setIsDataMigrationOpen] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const aiTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const selectionMapRef = useRef<Record<string, { start: number; end: number }>>({});
  const [selectionForNote, setSelectionForNote] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const polishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setLastSaved(Date.now());
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsExportOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        polishRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    try {
      window.desktop?.onNavigate?.((payload: { action: string }) => {
        if (!payload || !payload.action) return;
        if (payload.action === 'home' || payload.action === 'back') {
          if (isAiProcessingRef.current) {
            alert('AI 正在处理当前文档，请稍后再试');
            return;
          }
          setSelectedNoteId(null);
          setIsMobileMenuOpen(false);
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    const storedNotes = loadNotes();
    const storedSettings = loadSettings();
    setSettings(storedSettings);

    if (storedNotes.length > 0) {
      setNotes(storedNotes.sort((a, b) => b.updatedAt - a.updatedAt));
    } else {
      const welcomeNote: Note = {
        id: generateId(),
        title: '👋 欢迎使用 Insight Notes',
        content: `# 欢迎使用 Insight Notes

一款 AI 加持的 Markdown 笔记本，支持快速记录、分析与润色、导出与备份。

## 快速开始

1. **配置 AI**：打开左下角「设置」，填入你的模型与 API Key（支持 Gemini、OpenAI、DeepSeek 或本地 Ollama）。
2. **创建笔记**：点击侧边栏「+ 新建笔记」。
3. **AI 助手**：使用「分析」自动生成标签与摘要；使用「编辑」优化措辞。

## 常用快捷键

- \`Cmd/Ctrl + K\`：命令面板 / 全局搜索
- \`Cmd/Ctrl + S\`：保存
- \`Cmd/Ctrl + Shift + P\`：导出
- \`Cmd/Ctrl + Enter\`：AI 编辑

## 视图与布局

- 工具栏切换 **编辑 / 分屏 / 预览**
- 侧边栏与列表可折叠，移动端支持返回

\`\`\`mermaid
 graph LR
    A[灵感] --> B(草稿)
    B --> C{AI 助手}
    C -- 分析 --> D[标签/摘要]
    C -- 编辑 --> E[优化文本]
    D --> F[知识库]
    E --> F
\`\`\`

开始写作吧！`,
        category: '入门指南',
        tags: ['指南', '欢迎'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachments: {},
      };
      setNotes([welcomeNote]);
      saveNotes([welcomeNote]);
      setSelectedNoteId(welcomeNote.id);
      setCurrentNote(welcomeNote);
      selectionMapRef.current[welcomeNote.id] = { start: 0, end: 0 };
      setSelectionForNote({ start: 0, end: 0 });
    }
  }, []);

  useEffect(() => {
    if (!selectedNoteId) {
      setCurrentNote(null);
      return;
    }
    const target = notes.find(n => n.id === selectedNoteId);
    if (!target) {
      setCurrentNote(null);
      return;
    }
    if (currentNote && currentNote.id === target.id) return;
    setCurrentNote(target);
    const sel = selectionMapRef.current[target.id] || { start: target.content.length, end: target.content.length };
    setSelectionForNote(sel);
  }, [selectedNoteId, notes]);

  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (selectedCategory !== 'all') {
      result = selectedCategory === 'uncategorized' ? result.filter(n => !n.category) : result.filter(n => n.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)),
      );
    }
    const sortBy = settings.sortBy || 'updatedAt';
    const order = settings.sortOrder || 'desc';
    const cmp = (a: Note, b: Note) => {
      let av: any = 0;
      let bv: any = 0;
      switch (sortBy) {
        case 'updatedAt':
          av = a.updatedAt; bv = b.updatedAt; break;
        case 'createdAt':
          av = a.createdAt; bv = b.createdAt; break;
        case 'title':
          av = (a.title || '').toLowerCase(); bv = (b.title || '').toLowerCase(); break;
        case 'category':
          av = (a.category || '').toLowerCase(); bv = (b.category || '').toLowerCase(); break;
        case 'tagCount':
          av = (a.tags || []).length; bv = (b.tags || []).length; break;
        default:
          av = a.updatedAt; bv = b.updatedAt;
      }
      if (av === bv) return 0;
      if (order === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    };
    return result.sort(cmp);
  }, [notes, selectedCategory, searchQuery, settings.sortBy, settings.sortOrder]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach(n => {
      if (n.category) cats.add(n.category);
    });
    return Array.from(cats).sort();
  }, [notes]);

  const activeNote = currentNote;
  const isAiProcessing = isAiAnalyzing || isAiPolishing;

  useEffect(() => {
    isAiProcessingRef.current = isAiProcessing;
  }, [isAiProcessing]);

  const stats: NoteStats = useMemo(() => {
    if (!activeNote) return { words: 0, chars: 0, readingTime: 0 };
    const text = activeNote.content.replace(/[#*`>]/g, '');
    const chars = text.length;
    const words = text.match(/[\u4e00-\u9fa5]|\w+/g)?.length || 0;
    const readingTime = Math.ceil(words / 300);
    return { words, chars, readingTime };
  }, [activeNote]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsSettingsOpen(false);
  };

  const handleCreateNote = () => {
    if (isAiProcessing) {
      alert('AI 正在处理当前文档，请稍后再试');
      return;
    }
    const newNote: Note = {
      id: generateId(),
      title: '未命名笔记',
      content: '',
      category: selectedCategory !== 'all' && selectedCategory !== 'uncategorized' ? selectedCategory : '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: {},
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    setSelectedNoteId(newNote.id);
    setCurrentNote(newNote);
    setViewMode('edit');
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);

    const sel = { start: 0, end: 0 };
    selectionMapRef.current[newNote.id] = sel;
    setSelectionForNote(sel);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setCurrentNote(prev => {
      if (!prev || prev.id !== id) return prev;
      const next = { ...prev, ...updates, updatedAt: Date.now() };
      return next;
    });
  };

  useEffect(() => {
    if (!currentNote) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      setNotes(prev => {
        const idx = prev.findIndex(n => n.id === currentNote.id);
        const updated = idx === -1 ? [currentNote, ...prev] : prev.map(n => (n.id === currentNote.id ? currentNote : n));
        const sorted = [...updated].sort((a, b) => b.updatedAt - a.updatedAt);
        saveNotes(sorted);
        return sorted;
      });
      setLastSaved(Date.now());
    }, 600);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [currentNote]);

  const deleteNote = (id: string) => {
    let nextId = selectedNoteId;
    if (selectedNoteId === id) {
      const currentIndex = filteredNotes.findIndex(n => n.id === id);
      if (currentIndex !== -1) {
        if (filteredNotes.length > 1) {
          nextId = currentIndex === 0 ? filteredNotes[1].id : filteredNotes[currentIndex - 1].id;
        } else {
          nextId = null;
        }
      }
    }

    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    if (selectedNoteId === id) {
      setSelectedNoteId(nextId);
    }
  };

  const requestDeleteNote = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDeleteNote = () => {
    if (!pendingDeleteId) return;
    deleteNote(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const cancelDelete = () => setPendingDeleteId(null);

  const resolveAttachments = (note: Note) => {
    if (!note.attachments) return note.content;
    return note.content.replace(/!\[([^\]]*)\]\(attachment:([^)]+)\)/g, (match, alt, id) => {
      const dataUrl = note.attachments?.[id];
      return dataUrl ? `![${alt}](${dataUrl})` : match;
    });
  };

  const handleExportMarkdown = async () => {
    if (!activeNote) return;
    const suggested = `${activeNote.title || 'untitled'}.md`;
    const content = resolveAttachments(activeNote);
    await saveFile(new Blob([content], { type: 'text/markdown' }), { suggestedName: suggested, mime: 'text/markdown' });
  };

  const handleCopyContent = () => {
    if (!activeNote) return;
    const content = resolveAttachments(activeNote);
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const getNoteContext = (note: Note): string => {
    let context = `Title: ${note.title || 'Untitled'}\nTags: ${(note.tags || []).join(', ')}\n\n`;

    // Extract references: note://ID or pure 9-digit ID
    const refRegex = /(?:note:\/\/|\]\()(\d{9,10})/g;
    const matches = Array.from(note.content.matchAll(refRegex));
    const refIds = new Set(matches.map(m => m[1]));

    if (refIds.size > 0) {
      context += `--- Referenced Notes (引用内容) ---\n`;
      refIds.forEach(id => {
        if (id === note.id) return; // Skip self-reference
        const refNote = notes.find(n => n.id === id);
        if (refNote) {
          // Truncate long content to avoid context limit
          const snippet = refNote.content.slice(0, 1000) + (refNote.content.length > 1000 ? '...' : '');
          context += `Reference ID: ${id}\nTitle: ${refNote.title}\nTags: ${(refNote.tags || []).join(', ')}\nContent:\n${snippet}\n\n`;
        }
      });
      context += `--- End of References ---\n\n`;
    }

    context += `--- Main Content (文章主体) ---\n${note.content}`;
    return context;
  };

  const startAiTimer = () => {
    setAiElapsedTime(0);
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    aiTimerRef.current = setInterval(() => {
      setAiElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopAiTimer = () => {
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setAiElapsedTime(0);
  };

  const cancelAiOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopAiTimer();
    setIsAiAnalyzing(false);
    setIsAiPolishing(false);
  };

  const handleAiAnalyze = async () => {
    if (!activeNote) return;
    if (!settings.apiKey && !process.env.API_KEY && !settings.baseUrl?.includes('localhost')) {
      setIsSettingsOpen(true);
      setTimeout(() => alert('请先在设置中配置 API Key'), 100);
      return;
    }

    setIsAiAnalyzing(true);
    startAiTimer();
    abortControllerRef.current = new AbortController();
    
    try {
      const context = getNoteContext(activeNote);
      const result = await generateTagsAndSummary(
        context, 
        settings.apiKey, 
        settings.customAnalyzePrompt, 
        settings.baseUrl, 
        settings.model,
        abortControllerRef.current.signal
      );
      setPendingAnalyze({ tags: result.tags || [], summary: result.summary });
    } catch (error: any) {
      if (error.message === '操作已取消') return;
      if (error.message === 'API_KEY_MISSING') {
        setIsSettingsOpen(true);
      } else {
        alert(`AI 分析失败: ${error.message}`);
      }
    } finally {
      setIsAiAnalyzing(false);
      stopAiTimer();
      abortControllerRef.current = null;
    }
  };

  const handleAiPolish = async () => {
    if (!activeNote) return;
    if (!settings.apiKey && !process.env.API_KEY && !settings.baseUrl?.includes('localhost')) {
      setIsSettingsOpen(true);
      setTimeout(() => alert('请先在设置中配置 API Key'), 100);
      return;
    }

    setIsAiPolishing(true);
    startAiTimer();
    abortControllerRef.current = new AbortController();

    try {
      const context = getNoteContext(activeNote);
      const polished = await polishContent(
        context, 
        settings.apiKey, 
        settings.customPolishPrompt, 
        settings.baseUrl, 
        settings.model,
        abortControllerRef.current.signal
      );
      setPendingPolish(polished);
    } catch (error: any) {
      if (error.message === '操作已取消') return;
      if (error.message === 'API_KEY_MISSING') {
        setIsSettingsOpen(true);
      } else {
        alert(`AI 润色失败: ${error.message}`);
      }
    } finally {
      setIsAiPolishing(false);
      stopAiTimer();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    polishRef.current = handleAiPolish;
  }, [handleAiPolish]);

  const applyAnalyze = () => {
    if (!activeNote || !pendingAnalyze) return;
    const newTags = Array.from(new Set([...activeNote.tags, ...pendingAnalyze.tags]));
    let newContent = activeNote.content;
    if (pendingAnalyze.summary && !activeNote.content.includes('> **AI 摘要**:')) {
      newContent = `> **AI 摘要**: ${pendingAnalyze.summary}\n\n${activeNote.content}`;
    }
    handleUpdateNote(activeNote.id, { tags: newTags, content: newContent });
    setPendingAnalyze(null);
  };

  const applyPolish = () => {
    if (!activeNote || !pendingPolish) return;
    handleUpdateNote(activeNote.id, { content: pendingPolish });
    setPendingPolish(null);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    if (!settings.apiKey && !process.env.API_KEY && !settings.baseUrl?.includes('localhost')) {
      setIsSettingsOpen(true);
      setTimeout(() => alert('请先在设置中配置 API Key'), 100);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const history = [...chatMessages, userMsg];
    setChatMessages(history);
    setChatInput('');
    setChatLoading(true);
    try {
      const aiReply = await chatWithAI(userMsg.content, history, settings.apiKey, settings.baseUrl, settings.model);
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (error: any) {
      alert(`AI 对话失败: ${error.message}`);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setChatInput('');
  };

  const handleInsertContext = () => {
    if (!activeNote) return;
    const context = getNoteContext(activeNote);
    const promptPrefix = `请结合当前笔记及其引用内容回答，并保留上下文：\n\n${context}`;
    setChatInput(prev => (prev ? `${prev}\n\n${promptPrefix}` : promptPrefix));
    setIsChatOpen(true);
  };

  const handleExportData = () => {
    setIsDataMigrationOpen(true);
  };

  const handleImportData = (file: File) => {
    // Legacy support for direct file dropping if needed, 
    // but now we prefer opening the modal. 
    // However, SettingsModal might pass a file directly if using the old input.
    // We should probably update SettingsModal to just open the migration modal.
    setIsDataMigrationOpen(true);
  };

  const handleDataImport = (data: { settings?: Partial<AppSettings>; notes?: Note[] }, strategy: 'overwrite' | 'keep_both' | 'skip') => {
    if (data.settings) {
      const newSettings = { ...settings, ...data.settings };
      setSettings(newSettings);
      saveSettings(newSettings);
    }

    if (data.notes && data.notes.length > 0) {
      let mergedNotes = [...notes];
      const incomingNotes = data.notes;
      const existingIds = new Set(notes.map(n => n.id));

      if (strategy === 'keep_both') {
        // IDs are already regenerated in DataMigrationModal if needed, or we check collisions here
        // The modal regenerates IDs for ALL imported notes if 'keep_both' is selected? 
        // Actually the modal logic says: `id: n.id && ... ? String(n.id) : generateId()`.
        // If we want 'keep_both', we should probably regenerate IDs for colliding notes OR all notes.
        // Let's rely on the modal to have handled ID generation or just handle collisions here.
        // Wait, the modal code I wrote does NOT regenerate IDs if they look valid.
        // So we need to handle 'keep_both' by regenerating IDs for collisions here or blindly adding.
        
        // Let's refine: The modal passes `notesToImport`.
        // If strategy is keep_both, we should ensure no ID collisions.
        const notesToAdd = incomingNotes.map(n => {
            if (existingIds.has(n.id)) {
                return { ...n, id: generateId(), title: `${n.title} (Imported)` };
            }
            return n;
        });
        mergedNotes = [...notesToAdd, ...mergedNotes]; // Add new notes to top
      } else if (strategy === 'overwrite') {
        // Remove existing notes that are in the import list, then add imported ones
        const importIds = new Set(incomingNotes.map(n => n.id));
        mergedNotes = mergedNotes.filter(n => !importIds.has(n.id));
        mergedNotes = [...incomingNotes, ...mergedNotes];
      } else if (strategy === 'skip') {
        // Only add notes that don't exist
        const notesToAdd = incomingNotes.filter(n => !existingIds.has(n.id));
        mergedNotes = [...notesToAdd, ...mergedNotes];
      }
      
      // Sort and save
      mergedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(mergedNotes);
      saveNotes(mergedNotes);
      
      // Update UI if needed
      if (!selectedNoteId && mergedNotes.length > 0) {
        // Optional: select the first imported note
      }
      alert(`导入成功！已处理 ${data.notes.length} 篇笔记。`);
    } else if (data.settings) {
      alert('设置已更新');
    }
  };

  const handleSidebarClose = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    } else {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectNote = (id: string) => {
    if (isAiProcessing) {
      alert('AI 正在处理当前文档，请稍后再试');
      return;
    }
    setSelectedNoteId(id);
    setIsMobileMenuOpen(false);
    const sel = selectionMapRef.current[id];
    if (sel) {
      setSelectionForNote(sel);
    } else {
      const target = notes.find(n => n.id === id);
      const end = target ? target.content.length : 0;
      setSelectionForNote({ start: end, end });
    }
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith('note://')) {
      const id = href.replace('note://', '');
      const target = notes.find(n => n.id === id);
      if (target) {
        handleSelectNote(target.id);
        return;
      } else {
        alert('该笔记不存在或已被删除');
        return;
      }
    }
    // 兼容纯数字 ID 跳转
    if (href.match(/^\d{9,10}$/)) {
      const target = notes.find(n => n.id === href);
      if (target) {
        handleSelectNote(target.id);
        return;
      } else {
        alert('该笔记不存在或已被删除');
        return;
      }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden relative font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-800">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onCreateNote={(note) => {
            if (isAiProcessing) {
              alert('AI 正在处理当前文档，请稍后再试');
              return;
            }
            const updatedNotes = [note, ...notes];
            setNotes(updatedNotes);
            saveNotes(updatedNotes);
            setSelectedNoteId(note.id);
            setCurrentNote(note);
            setViewMode('edit');
            
            const sel = { start: 0, end: 0 };
            selectionMapRef.current[note.id] = sel;
            setSelectionForNote(sel);
            setIsSettingsOpen(false);
        }}
        onOpenMigration={() => {
          // Keep settings open? No, maybe close settings and open migration, or open migration on top.
          // Modal stacking works if z-index is correct. DataMigrationModal has z-[120], SettingsModal z-[100].
          // So we can keep settings open or close it. Closing it feels cleaner for "migration".
          // But user might want to go back. Let's try stacking.
          setIsDataMigrationOpen(true);
        }}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        notes={notes}
        onSelectNote={id => {
          handleSelectNote(id);
        }}
      />

      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />}

      {!selectedNoteId && !isMobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur border-b border-slate-200 z-20 flex items-center px-4 justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <Menu size={20} />
            </button>
            <span className="font-bold text-slate-800 tracking-tight text-lg">Insight Notes</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
            {settings.userName ? settings.userName.charAt(0) : 'U'}
          </div>
        </div>
      )}

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        categories={categories}
        notes={notes}
        selectedCategory={selectedCategory}
        settings={settings}
        onCreateNote={handleCreateNote}
        onSelectCategory={cat => setSelectedCategory(cat)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenGitReport={() => setIsGitReportOpen(true)}
        onOpenDevTools={() => setIsDevToolsOpen(true)}
        onClose={handleSidebarClose}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col md:flex-row h-full transition-all duration-300 pt-14 md:pt-0 md:min-w-0">
        <NoteList
          filteredNotes={filteredNotes}
          selectedNoteId={selectedNoteId}
          searchQuery={searchQuery}
          isNoteListOpen={isNoteListOpen}
          isSidebarOpen={isSidebarOpen}
          onSearch={value => setSearchQuery(value)}
          onSelectNote={handleSelectNote}
          onDeleteNote={requestDeleteNote}
          onCloseList={() => setIsNoteListOpen(false)}
          sortBy={settings.sortBy}
          sortOrder={settings.sortOrder}
          onChangeSort={(sb, so) => {
            const next = { ...settings, sortBy: sb, sortOrder: so };
            setSettings(next);
            saveSettings(next);
          }}
        />

        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden z-0 min-w-0">
          {activeNote ? (
            <>
              <EditorToolbar
                activeNote={activeNote}
                viewMode={viewMode}
                isSidebarOpen={isSidebarOpen}
                isNoteListOpen={isNoteListOpen}
                isAiAnalyzing={isAiAnalyzing}
                isAiPolishing={isAiPolishing}
                isCopied={isCopied}
                isFullScreen={isFullScreen}
                onToggleSidebar={() => setIsSidebarOpen(true)}
                onToggleNoteList={() => setIsNoteListOpen(true)}
                onBack={() => {
                  if (isAiProcessing) {
                    alert('AI 正在处理当前文档，请稍后再试');
                    return;
                  }
                  setSelectedNoteId(null);
                }}
                onTitleChange={value => handleUpdateNote(activeNote.id, { title: value })}
                onChangeViewMode={mode => setViewMode(mode)}
                onAnalyze={handleAiAnalyze}
                onPolish={handleAiPolish}
                onCopy={handleCopyContent}
                onExport={() => setIsExportOpen(true)}
                onToggleChat={() => setIsChatOpen(v => !v)}
                onToggleFullScreen={handleToggleFullScreen}
              />
              <EditorContent
                activeNote={activeNote}
                allNotes={notes}
                viewMode={viewMode}
                stats={stats}
                lastSaved={lastSaved}
                onUpdateNote={handleUpdateNote}
                selection={selectionForNote}
                onSelectionChange={(start, end) => {
                  selectionRef.current = { start, end };
                  selectionMapRef.current[activeNote.id] = { start, end };
                  setSelectionForNote({ start, end });
                }}
                markdownTheme={settings.markdownTheme || 'classic'}
                isReadOnly={false}
                onLinkClick={handleLinkClick}
              />
            </>
          ) : (
            <EmptyState onCreateNote={handleCreateNote} />
          )}
        </div>
      </div>
      <DeleteConfirm
        open={!!pendingDeleteId}
        noteTitle={notes.find(n => n.id === pendingDeleteId)?.title || '这篇笔记'}
        onCancel={cancelDelete}
        onConfirm={confirmDeleteNote}
      />
      {/* AI Operation Status & Cancel */}
      {(isAiAnalyzing || isAiPolishing) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-lg border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
           <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
           <span className="text-sm font-medium text-slate-700">
             {isAiAnalyzing ? '正在分析...' : '正在编辑...'} ({aiElapsedTime.toFixed(0)}s)
           </span>
           <button 
             onClick={cancelAiOperation}
             className="ml-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors"
           >
             取消
           </button>
        </div>
      )}

      <AiChatPanel
        open={isChatOpen}
        messages={chatMessages}
        input={chatInput}
        loading={chatLoading}
        onInputChange={setChatInput}
        onSend={handleChatSend}
        onClose={() => setIsChatOpen(false)}
        onNewChat={handleNewChat}
        onInsertContext={activeNote ? handleInsertContext : undefined}
        noteTitle={activeNote?.title}
        modelName={settings.model}
      />
      <AiReviewModal
        open={!!pendingAnalyze}
        mode="analyze"
        original={activeNote || null}
        analyzeResult={pendingAnalyze ? { tags: pendingAnalyze.tags, summary: pendingAnalyze.summary } : undefined}
        onCancel={() => setPendingAnalyze(null)}
        onConfirm={applyAnalyze}
      />
      <AiReviewModal
        open={!!pendingPolish}
        mode="polish"
        original={activeNote || null}
        polishedContent={pendingPolish || undefined}
        onCancel={() => setPendingPolish(null)}
        onConfirm={applyPolish}
      />

      <ExportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        note={activeNote || null}
        theme={settings.markdownTheme || 'classic'}
        onExportMarkdown={handleExportMarkdown}
      />
      
      <GitReportModal
        isOpen={isGitReportOpen}
        onClose={() => setIsGitReportOpen(false)}
        settings={settings}
        allNotes={notes}
        onCreateNote={(noteOrNotes) => {
          const newItems = Array.isArray(noteOrNotes) ? noteOrNotes : [noteOrNotes];
          setNotes(prev => {
             const updated = [...newItems, ...prev];
             saveNotes(updated);
             return updated;
          });
          
          // alert('笔记已创建！');
        }}
      />
      
      <DevToolsModal
        isOpen={isDevToolsOpen}
        onClose={() => setIsDevToolsOpen(false)}
      />

      <DataMigrationModal
        isOpen={isDataMigrationOpen}
        onClose={() => setIsDataMigrationOpen(false)}
        currentSettings={settings}
        currentNotes={notes}
        onImport={handleDataImport}
      />
    </div>
  );
};

export default App;
