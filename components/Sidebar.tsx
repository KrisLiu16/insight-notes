import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, GitBranch, Hash, LayoutTemplate, PanelLeftClose, Plus, Search, Settings, X, Wrench } from 'lucide-react';
import { AppSettings, Note } from '../types';

interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
  className?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, count, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 mb-1 group relative overflow-hidden ${
      active ? 'bg-white text-blue-700 font-semibold shadow-sm ring-1 ring-slate-100' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    } ${className}`}
  >
    <div className="flex items-center gap-3 relative z-10">
      <Icon size={18} className={`transition-transform duration-300 ${active ? 'scale-110 text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span>{label}</span>
    </div>
    {count !== undefined && (
      <span className={`text-[10px] px-2 py-0.5 rounded-full transition-colors relative z-10 ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/50 text-slate-500'}`}>{count}</span>
    )}
  </button>
);

interface SidebarProps {
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  categories: string[];
  notes: Note[];
  selectedCategory: string;
  settings: AppSettings;
  onCreateNote: () => void;
  onSelectCategory: (category: string) => void;
  onOpenSettings: () => void;
  onOpenCommand: () => void;
  onOpenGitReport: () => void;
  onOpenDevTools: () => void;
  onClose: () => void;
  onCloseMobileMenu: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  isMobileMenuOpen,
  categories,
  notes,
  selectedCategory,
  settings,
  onCreateNote,
  onSelectCategory,
  onOpenSettings,
  onOpenCommand,
  onOpenGitReport,
  onOpenDevTools,
  onClose,
  onCloseMobileMenu,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-40 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200 transform transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex flex-col shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'md:w-64' : 'md:w-0 md:border-r-0 md:overflow-hidden'}
      `}
    >
      <div className="h-16 flex items-center justify-between px-5 shrink-0 bg-transparent relative z-20">
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:ring-2 hover:ring-blue-200 transition-all cursor-pointer"
            >
              {settings.userName ? settings.userName.charAt(0).toUpperCase() : 'U'}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-semibold text-slate-800 truncate">{settings.userName || 'Insight User'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Personal Workspace</p>
                </div>
                
                <div className="p-1">
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setIsProfileMenuOpen(false);
                      onCloseMobileMenu();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 rounded-lg transition-colors"
                  >
                    <Settings size={16} className="text-slate-400" />
                    设置与 API
                  </button>
                  
                  <button
                    onClick={() => {
                        onOpenDevTools();
                        setIsProfileMenuOpen(false);
                        onCloseMobileMenu();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 rounded-lg transition-colors"
                  >
                    <Wrench size={16} className="text-slate-400" />
                    开发工具箱
                  </button>
                </div>
              </div>
            )}
          </div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Insight Notes</h1>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors" title="关闭侧边栏">
          {window.innerWidth < 768 ? <X size={20} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => {
            onCreateNote();
            onCloseMobileMenu();
          }}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 py-2.5 px-4 rounded-xl font-medium transition-all shadow-sm hover:shadow-md group"
        >
          <Plus size={18} className="text-blue-500 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
          新建笔记
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-6">
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">My Notes</h3>
            <button onClick={onOpenCommand} className="text-slate-400 hover:text-blue-600 transition-colors" title="搜索 (Cmd+K)">
              <Search size={14} />
            </button>
          </div>
          <SidebarItem icon={LayoutTemplate} label="全部笔记" active={selectedCategory === 'all'} count={notes.length} onClick={() => { onSelectCategory('all'); onCloseMobileMenu(); }} />
          <SidebarItem
            icon={BookOpen}
            label="未分类"
            active={selectedCategory === 'uncategorized'}
            count={notes.filter(n => !n.category).length}
            onClick={() => {
              onSelectCategory('uncategorized');
              onCloseMobileMenu();
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">Topics</h3>
            {categories.length > 0 && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md font-mono">{categories.length}</span>}
          </div>
          <div className="space-y-0.5">
            {categories.map(cat => (
              <SidebarItem
                key={cat}
                icon={Hash}
                label={cat}
                active={selectedCategory === cat}
                count={notes.filter(n => n.category === cat).length}
                onClick={() => {
                  onSelectCategory(cat);
                  onCloseMobileMenu();
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tools</h3>
        </div>
        <SidebarItem 
          icon={GitBranch} 
          label="Git 工作汇报" 
          onClick={() => {
            onOpenGitReport();
            onCloseMobileMenu();
          }} 
        />
      </div>
    </div>
  );
};

export default Sidebar;
