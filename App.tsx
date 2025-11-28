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
  const [isCopied, setIsCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [history, setHistory] = useState<Note[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingAnalyze, setPendingAnalyze] = useState<{ tags: string[]; summary?: string } | null>(null);
  const [pendingPolish, setPendingPolish] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const lastSnapshotKeyRef = useRef<string>('');
  const snapshotKey = (note: Note) =>
    `${note.id}|${note.title}|${note.content}|${note.category || ''}|${(note.tags || []).join(',')}|${Object.keys(note.attachments || {}).length}`;

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
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAiPolish();
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoNote();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redoNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        title: '👋 Welcome to Insight Notes',
        content: `# Welcome to Insight Notes

An AI-assisted Markdown notebook for fast capture, polish, and export.

## Quick start

1. **Configure AI**: open Settings (bottom-left) and add your provider key (Gemini, OpenAI, DeepSeek, or local Ollama).
2. **Create**: click "+ New Note" in the sidebar.
3. **AI help**: use "Analyze" to auto-tag and "Polish" to refine wording.

## Shortcuts

- \`Cmd/Ctrl + K\`: command palette / search
- \`Cmd/Ctrl + S\`: save
- \`Cmd/Ctrl + Shift + P\`: open export
- \`Cmd/Ctrl + Enter\`: AI polish

## Layout

- Toggle **Edit / Split / Preview** from the toolbar.
- Collapse the sidebar to focus.

\`\`\`mermaid
 graph LR
    A[Idea] --> B(Draft)
    B --> C{AI Assistant}
    C -- Analyze --> D[Auto Tags]
    C -- Polish --> E[Refine Text]
    D --> F[Library]
    E --> F
\`\`\`

Happy writing!`,
        category: 'Getting Started',
        tags: ['Guide', 'Welcome'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachments: {},
      };
      setNotes([welcomeNote]);
      saveNotes([welcomeNote]);
      setSelectedNoteId(welcomeNote.id);
      setCurrentNote(welcomeNote);
      setHistory([welcomeNote]);
      setHistoryIndex(0);
      lastSnapshotKeyRef.current = snapshotKey(welcomeNote);
    }
  }, []);

  useEffect(() => {
    if (!selectedNoteId) {
      setCurrentNote(null);
      setHistory([]);
      setHistoryIndex(-1);
      lastSnapshotKeyRef.current = '';
      return;
    }
    const target = notes.find(n => n.id === selectedNoteId);
    if (!target) {
      setCurrentNote(null);
      return;
    }
    const currentKey = currentNote ? snapshotKey(currentNote) : '';
    const targetKey = snapshotKey(target);
    if (currentNote && currentNote.id === target.id && currentKey === targetKey) return;
    setCurrentNote(target);
    setHistory([target]);
    setHistoryIndex(0);
    lastSnapshotKeyRef.current = targetKey;
  }, [selectedNoteId, notes, currentNote]);

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
    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach(n => {
      if (n.category) cats.add(n.category);
    });
    return Array.from(cats).sort();
  }, [notes]);

  const activeNote = currentNote;

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
    const newNote: Note = {
      id: generateId(),
      title: '未命名灵感',
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

    setHistory([newNote]);
    setHistoryIndex(0);
    lastSnapshotKeyRef.current = snapshotKey(newNote);
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

  useEffect(() => {
    if (!currentNote) return;
    if (historyTimerRef.current) {
      window.clearTimeout(historyTimerRef.current);
    }
    historyTimerRef.current = window.setTimeout(() => {
      const key = snapshotKey(currentNote);
      if (key === lastSnapshotKeyRef.current) return;
      const snapshot = { ...currentNote };
      setHistory(prev => {
        const next = prev.slice(0, historyIndex + 1).concat(snapshot);
        const trimmed = next.slice(-30); // cap history size
        setHistoryIndex(trimmed.length - 1);
        return trimmed;
      });
      lastSnapshotKeyRef.current = key;
    }, 1200);

    return () => {
      if (historyTimerRef.current) {
        window.clearTimeout(historyTimerRef.current);
      }
    };
  }, [currentNote, historyIndex]);

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

  const undoNote = () => {
    if (historyIndex <= 0 || !activeNote) return;
    const prevIndex = historyIndex - 1;
    const prev = history[prevIndex];
    if (!prev) return;
    setHistoryIndex(prevIndex);
    lastSnapshotKeyRef.current = snapshotKey(prev);
    setCurrentNote({ ...prev });
  };

  const redoNote = () => {
    if (historyIndex >= history.length - 1 || !activeNote) return;
    const nextIndex = historyIndex + 1;
    const next = history[nextIndex];
    if (!next) return;
    setHistoryIndex(nextIndex);
    lastSnapshotKeyRef.current = snapshotKey(next);
    setCurrentNote({ ...next });
  };

  const handleCopyContent = () => {
    if (!activeNote) return;
    const content = resolveAttachments(activeNote);
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleAiAnalyze = async () => {
    if (!activeNote) return;
    if (!settings.apiKey && !process.env.API_KEY && !settings.baseUrl?.includes('localhost')) {
      setIsSettingsOpen(true);
      setTimeout(() => alert('请先在设置中配置 API Key'), 100);
      return;
    }

    setIsAiAnalyzing(true);
    try {
      const result = await generateTagsAndSummary(activeNote.content, settings.apiKey, settings.customAnalyzePrompt, settings.baseUrl, settings.model);
      setPendingAnalyze({ tags: result.tags || [], summary: result.summary });
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') {
        setIsSettingsOpen(true);
      } else {
        alert(`AI 分析失败: ${error.message}`);
      }
    } finally {
      setIsAiAnalyzing(false);
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
    try {
      const polished = await polishContent(activeNote.content, settings.apiKey, settings.customPolishPrompt, settings.baseUrl, settings.model);
      setPendingPolish(polished);
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') {
        setIsSettingsOpen(true);
      } else {
        alert(`AI 润色失败: ${error.message}`);
      }
    } finally {
      setIsAiPolishing(false);
    }
  };

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
    const snippet = activeNote.content.slice(0, 1500);
    const context = `请结合当前笔记《${activeNote.title || '未命名'}》回答，并保留上下文：\n${snippet}`;
    setChatInput(prev => (prev ? `${prev}\n\n${context}` : context));
    setIsChatOpen(true);
  };

  const handleExportData = async () => {
    const mergedNotes = currentNote
      ? (() => {
          const idx = notes.findIndex(n => n.id === currentNote.id);
          if (idx === -1) return [currentNote, ...notes];
          const clone = [...notes];
          clone[idx] = currentNote;
          return clone;
        })()
      : notes;
    const payload = {
      version: 'zhishi-v1',
      exportedAt: new Date().toISOString(),
      notes: mergedNotes,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    await saveFile(blob, { suggestedName: `zhishi-backup-${new Date().toISOString().slice(0, 10)}.json`, mime: 'application/json' });
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.notes || !Array.isArray(parsed.notes)) throw new Error('缺少 notes 字段');
        if (!parsed.settings || typeof parsed.settings !== 'object') throw new Error('缺少 settings 字段');

        const firstNote = parsed.notes[0] || null;
        setNotes(parsed.notes);
        saveNotes(parsed.notes);
        setSettings(parsed.settings);
        saveSettings(parsed.settings);
        setSelectedNoteId(firstNote?.id || null);
        setCurrentNote(firstNote);
        setHistory(firstNote ? [firstNote] : []);
        setHistoryIndex(firstNote ? 0 : -1);
        lastSnapshotKeyRef.current = firstNote ? snapshotKey(firstNote) : '';
        setIsSettingsOpen(false);
        alert('导入完成，当前数据已被覆盖');
      } catch (err: any) {
        alert(`导入失败: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSidebarClose = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    } else {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden relative font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-800">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        notes={notes}
        onSelectNote={id => {
          setSelectedNoteId(id);
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
                isReadOnly={isReadOnly}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onToggleSidebar={() => setIsSidebarOpen(true)}
                onToggleNoteList={() => setIsNoteListOpen(true)}
                onBack={() => setSelectedNoteId(null)}
                onTitleChange={value => handleUpdateNote(activeNote.id, { title: value })}
                onChangeViewMode={mode => setViewMode(mode)}
                onAnalyze={handleAiAnalyze}
                onPolish={handleAiPolish}
                onCopy={handleCopyContent}
                onExport={() => setIsExportOpen(true)}
                onToggleChat={() => setIsChatOpen(v => !v)}
                onToggleReadOnly={() => setIsReadOnly(v => !v)}
                onUndo={undoNote}
                onRedo={redoNote}
              />
              <EditorContent
                activeNote={activeNote}
                viewMode={viewMode}
                stats={stats}
                lastSaved={lastSaved}
                onUpdateNote={handleUpdateNote}
                markdownTheme={settings.markdownTheme || 'classic'}
                isReadOnly={isReadOnly}
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
    </div>
  );
};

export default App;
