import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Note } from '../types';

const CornerDownLeft = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 10 4 15 9 20" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </svg>
);

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, notes, onSelectNote }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredNotes = useMemo(() => {
    if (!search) return notes.slice(0, 50);
    const q = search.toLowerCase();
    return notes
      .filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
      .slice(0, 1000);
  }, [notes, search]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredNotes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (filteredNotes[selectedIndex]) {
          onSelectNote(filteredNotes[selectedIndex].id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNotes, selectedIndex, onClose, onSelectNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ring-1 ring-slate-200">
        <div className="flex items-center px-4 border-b border-slate-100">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="w-full px-4 py-4 text-lg outline-none text-slate-700 placeholder:text-slate-300 bg-transparent"
            placeholder="搜索笔记..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">ESC</span>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">未找到相关内容</p>
            </div>
          ) : (
            <div className="py-2">
              <h3 className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Results</h3>
              {filteredNotes.map((note, idx) => (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-3 mx-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${idx === selectedIndex ? 'bg-blue-50 text-blue-800' : 'text-slate-700'}`}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate text-sm">{note.title || '无标题'}</span>
                    <span className={`text-xs truncate ${idx === selectedIndex ? 'text-blue-500/70' : 'text-slate-400'}`}>{note.content.substring(0, 50).replace(/[#*`>]/g, '') || '空笔记'}</span>
                  </div>
                  {idx === selectedIndex && <CornerDownLeft size={14} className="text-blue-400 shrink-0 ml-2" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100 flex justify-between">
          <span>{notes.length} 篇笔记</span>
          <span>使用 ↑↓ 导航，Enter 选择</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
