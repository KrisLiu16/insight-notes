import React, { useMemo } from 'react';
import { Link } from 'lucide-react';
import { Note } from '../types';

interface BacklinksPanelProps {
  currentNoteId: string;
  notes: Note[];
  onSelectNote: (id: string) => void;
}

const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ currentNoteId, notes, onSelectNote }) => {
  const backlinks = useMemo(() => {
    return notes.filter(note => {
      if (note.id === currentNoteId) return false;
      // Check for note://ID
      if (note.content.includes(`note://${currentNoteId}`)) return true;
      // Check for (ID) - simplified format
      // Matches ](123456789)
      if (note.content.includes(`](${currentNoteId})`)) return true;
      return false;
    });
  }, [currentNoteId, notes]);

  if (backlinks.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-4 text-slate-400">
        <Link size={14} />
        <h3 className="text-xs font-bold uppercase tracking-wider">被以下笔记引用 ({backlinks.length})</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {backlinks.map(note => (
          <button
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm transition-all group bg-white"
          >
            <div className="font-medium text-slate-700 group-hover:text-blue-700 truncate mb-1">
              {note.title || '未命名笔记'}
            </div>
            <div className="text-xs text-slate-400 truncate opacity-80 group-hover:opacity-100">
               {new Date(note.updatedAt).toLocaleDateString()} · {note.category || '未分类'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BacklinksPanel;
