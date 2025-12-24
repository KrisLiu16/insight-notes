import React, { useState, useEffect, useRef } from 'react';
import { PanelLeftClose, Search, Trash2, Tag, SortAsc, SortDesc } from 'lucide-react';
import { Note } from '../types';

interface NoteListProps {
  filteredNotes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  isNoteListOpen: boolean;
  isSidebarOpen: boolean;
  onSearch: (value: string) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCloseList: () => void;
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'category' | 'tagCount';
  sortOrder?: 'asc' | 'desc';
  onChangeSort?: (sortBy: 'updatedAt' | 'createdAt' | 'title' | 'category' | 'tagCount', sortOrder: 'asc' | 'desc') => void;
}

const NoteList: React.FC<NoteListProps> = ({
  filteredNotes,
  selectedNoteId,
  searchQuery,
  isNoteListOpen,
  isSidebarOpen,
  onSearch,
  onSelectNote,
  onDeleteNote,
  onCloseList,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  onChangeSort,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (value: string, immediate = false) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) {
      onSearch(value);
    } else {
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 1500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    if (!isComposingRef.current) {
      handleSearch(value);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const value = e.currentTarget.value;
    setLocalQuery(value);
    handleSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault(); // 阻止默认提交
      handleSearch(localQuery, true); // 立即搜索
    }
  };

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'updatedAt': return '更新时间';
      case 'createdAt': return '创建时间';
      case 'title': return '标题';
      case 'category': return '分类';
      case 'tagCount': return '标签数';
      default: return '默认';
    }
  };

  return (
    <div
      className={`
        bg-white flex flex-col h-full min-h-0 z-10 transition-all duration-300 ease-in-out md:overflow-hidden
        ${selectedNoteId ? 'hidden md:flex' : 'flex'}
        ${
          isNoteListOpen
            ? 'w-full md:w-72 md:flex-none md:min-w-[18rem] md:opacity-100 md:border-r md:border-slate-200'
            : 'w-0 md:w-0 md:min-w-0 md:flex-[0_0_0] md:opacity-0 md:pointer-events-none md:border-r-0'
        }
      `}
    >
      <div className="h-16 px-4 flex items-center border-b border-slate-50 shrink-0 sticky top-0 bg-white z-10 gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder="筛选..."
            value={localQuery}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-50 focus:border-blue-200 focus:bg-white transition-all outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <div 
            className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title={`排序：${getSortLabel(sortBy)} (${sortOrder === 'asc' ? '升序' : '降序'})`}
          >
            {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={e => {
                const [sb, so] = e.target.value.split(':') as any;
                onChangeSort && onChangeSort(sb, so);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="updatedAt:desc">按更新时间(新→旧)</option>
              <option value="updatedAt:asc">按更新时间(旧→新)</option>
              <option value="createdAt:desc">按创建时间(新→旧)</option>
              <option value="createdAt:asc">按创建时间(旧→新)</option>
              <option value="title:asc">按标题(A→Z)</option>
              <option value="title:desc">按标题(Z→A)</option>
              <option value="category:asc">按分类(A→Z)</option>
              <option value="category:desc">按分类(Z→A)</option>
              <option value="tagCount:desc">按标签数(多→少)</option>
              <option value="tagCount:asc">按标签数(少→多)</option>
            </select>
          </div>

          <button 
            onClick={onCloseList} 
            className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-colors hidden md:flex items-center justify-center w-8 h-8" 
            title="关闭列表"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-slate-400 px-6 text-center">
            <p className="text-xs">未找到笔记</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`group relative p-3 cursor-pointer transition-all duration-300 rounded-xl border ${
                selectedNoteId === note.id
                  ? 'bg-blue-50/50 border-blue-100 shadow-sm'
                  : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50 hover:shadow-sm'
              }`}
            >
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteNote(note.id);
                  }}
                  className="p-1.5 bg-white shadow-sm border border-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 hover:border-red-100 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} className="pointer-events-none" />
                </button>
              </div>

              <h3 className={`font-semibold text-sm mb-1 truncate pr-6 ${selectedNoteId === note.id ? 'text-blue-900' : 'text-slate-700'}`}>{note.title || '无标题'}</h3>
              <p className={`text-xs h-[2.6em] line-clamp-2 mb-2 leading-[1.3] font-normal break-all ${selectedNoteId === note.id ? 'text-blue-900/60' : 'text-slate-500'}`}>
                {note.content.replace(/[#*`>]/g, '').trim() || '空笔记...'}
              </p>
              <div className="flex items-center justify-between text-[10px] gap-2">
                <span className={`shrink-0 ${selectedNoteId === note.id ? 'text-blue-400' : 'text-slate-400'}`}>{new Date(note.updatedAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1 overflow-hidden justify-end">
                   {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      <Tag size={10} />
                      <span className="max-w-[60px] truncate">{note.tags[0]}</span>
                      {note.tags.length > 1 && <span>+{note.tags.length - 1}</span>}
                    </div>
                  )}
                  {note.category && <span className={`px-2 py-0.5 rounded-md font-medium shrink-0 ${selectedNoteId === note.id ? 'bg-blue-200/50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{note.category}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NoteList;
