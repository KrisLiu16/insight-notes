import React, { useState, useEffect, useRef } from 'react';
import { FilePlus, FileText, Filter, Folder, GitBranch, Globe, Loader2, RefreshCw, Settings, X, Save, Layers, ArrowUp, ArrowDown, Search, SortAsc, SortDesc } from 'lucide-react';
import { getGitConfigUser, getMergeDiff, getGitRemoteUrl, parseGitUrl, GitMerge, getMergeCommitInfo, getMergeFiles, getMergeStat, GitCommitInfo, getMergeCount, getMergePage } from '../services/git';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import diffLang from 'react-syntax-highlighter/dist/esm/languages/hljs/diff';
import githubStyle from 'react-syntax-highlighter/dist/esm/styles/hljs/github';
import { AppSettings, Note } from '../types';
import { generateMergeSummary, chatWithAI } from '../services/gemini';
import { generateId, DEFAULT_MERGE_SUMMARY_PROMPT, DEFAULT_REQUIREMENT_PROMPT, saveSettings } from '../services/storage';

interface GitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  allNotes?: Note[];
  onCreateNote?: (note: Note) => void;
}

const GitReportModal: React.FC<GitReportModalProps> = ({ isOpen, onClose, settings, allNotes = [], onCreateNote }) => {
  const [mode, setMode] = useState<'single' | 'requirement'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AppSettings['sortBy']>(settings.sortBy || 'updatedAt');
  const [sortOrder, setSortOrder] = useState<AppSettings['sortOrder']>(settings.sortOrder || 'desc');
  
  // Requirement Mode States
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [excludeCode, setExcludeCode] = useState(settings.excludeCodeInRequirement ?? true);
  const [requirementPrompt, setRequirementPrompt] = useState(settings.customRequirementPrompt || DEFAULT_REQUIREMENT_PROMPT);
  const [requirementContext, setRequirementContext] = useState('');
  
  useEffect(() => {
     setRequirementPrompt(settings.customRequirementPrompt || DEFAULT_REQUIREMENT_PROMPT);
  }, [settings.customRequirementPrompt]);

  useEffect(() => {
    setSortBy(settings.sortBy || 'updatedAt');
    setSortOrder(settings.sortOrder || 'desc');
  }, [settings.sortBy, settings.sortOrder]);

  const [repoPath, setRepoPath] = useState('');
  const [gitUser, setGitUser] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [parsedRepoName, setParsedRepoName] = useState<string | null>(null);
  const [merges, setMerges] = useState<GitMerge[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedMerge, setSelectedMerge] = useState<GitMerge | null>(null);
  const [diffText, setDiffText] = useState('');
  const [fileList, setFileList] = useState<Array<{ status: string; path: string }>>([]);
  const [statText, setStatText] = useState('');
  const [commitInfo, setCommitInfo] = useState<GitCommitInfo | null>(null);
  const [totalMerges, setTotalMerges] = useState(0);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const makeConciseRequirementTitle = (raw: string): string => {
    let prefix = /\[?Requirement\]?/i.test(raw) ? (raw.trim().startsWith('[') ? '[Requirement]' : 'Requirement') : 'Requirement';
    let content = raw.replace(/^\s*#\s*/, '')
      .replace(/^\s*\[?Requirement\]?\s*[:：]?\s*/i, '')
      .replace(/^\s*\[[^\]]+\]\s*/, '')
      .trim();
    const parts = content.split(/[+&/，、]+/).map(s => s.trim()).filter(Boolean).slice(0, 2);
    let concise = parts.join(' & ');
    const maxLen = 30;
    if (concise.length > maxLen) concise = concise.slice(0, maxLen) + '...';
    return `${prefix} ${concise || content}`.trim();
  };

  const requirementCandidates = React.useMemo(() => {
    const gitCandidates = allNotes.filter(n => n.tags.includes('GitMerge') || n.category === 'Git Reports' || (n.category || '').includes('Git'));
    const q = searchQuery.trim().toLowerCase();
    const byQuery = q ? gitCandidates.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q))) : gitCandidates;
    const cmp = (a: Note, b: Note) => {
      let av: any = 0; let bv: any = 0;
      switch (sortBy) {
        case 'updatedAt': av = a.updatedAt; bv = b.updatedAt; break;
        case 'createdAt': av = a.createdAt; bv = b.createdAt; break;
        case 'title': av = (a.title || '').toLowerCase(); bv = (b.title || '').toLowerCase(); break;
        case 'category': av = (a.category || '').toLowerCase(); bv = (b.category || '').toLowerCase(); break;
        case 'tagCount': av = (a.tags || []).length; bv = (b.tags || []).length; break;
        default: av = a.updatedAt; bv = b.updatedAt;
      }
      if (av === bv) return 0;
      if (sortOrder === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    };
    return byQuery.sort(cmp);
  }, [allNotes, searchQuery, sortBy, sortOrder]);

  const baseGitCandidatesCount = React.useMemo(() => {
    return allNotes.filter(n => n.tags.includes('GitMerge') || n.category === 'Git Reports' || (n.category || '').includes('Git')).length;
  }, [allNotes]);
  
  // AI Summary States
  const [showSettings, setShowSettings] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [includeDiff, setIncludeDiff] = useState(true);
  const [customPrompt, setCustomPrompt] = useState(settings.customMergePrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Preview State
  const [previewNote, setPreviewNote] = useState<{ title: string; content: string; category: string; tags: string[] } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);

  useEffect(() => {
    setCustomPrompt(settings.customMergePrompt || '');
  }, [settings.customMergePrompt]);

  SyntaxHighlighter.registerLanguage('diff', diffLang);

  const parseDiff = (text: string): Array<{ file: string; content: string }> => {
    const lines = text.split('\n');
    const result: Array<{ file: string; content: string }> = [];
    let currentFile = '';
    let currentContent: string[] = [];
    const flush = () => {
      if (currentFile) result.push({ file: currentFile, content: currentContent.join('\n') });
      currentFile = '';
      currentContent = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('diff --git ')) {
        flush();
        const m = line.match(/^diff --git a\/(.+) b\/(.+)$/);
        currentFile = m ? m[2] : line;
        continue;
      }
      currentContent.push(line);
    }
    flush();
    return result;
  };

  const matchStatus = (file: string): string => {
    const found = fileList.find(f => f.path === file || file.endsWith(f.path));
    return found ? found.status : '';
  };

  useEffect(() => {
    if (isOpen && !repoPath) {
      // Could auto-detect or load last used path here
    }
  }, [isOpen]);

  const handleGenerateRequirement = async () => {
    if (selectedNotes.length === 0 || !onCreateNote) return;
    if (!settings.apiKey && !process.env.API_KEY && !settings.baseUrl?.includes('localhost')) {
      alert('请先在主设置中配置 API Key');
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      // 1. Prepare Content
      let combinedDocs = '';
      
      selectedNotes.forEach((note, index) => {
        let content = note.content;
        
        // Remove code blocks if requested
        if (excludeCode) {
           // Regex to match code blocks ```...``` and replace with [Code Details Omitted]
           // Keep the file path if it's usually near the code block? 
           // Our Git reports format: ### path/to/file \n ```...```
           // So we just remove the ```...``` blocks.
           content = content.replace(/```[\s\S]*?```/g, '\n> [代码细节已省略，请参考原文档]\n');
        }
        
        combinedDocs += `\n\n=== Document ${index + 1}: ${note.title} (ID: ${note.id}) ===\n\n${content}`;
      });

      const fullPrompt = `${requirementPrompt}\n\n[Requirement Context]:\n${requirementContext}\n\n[Merged Documents]:\n${combinedDocs}`;

      // 2. Call AI
      const summary = await chatWithAI(
        fullPrompt,
        [],
        settings.apiKey,
        settings.baseUrl,
        settings.model
      );

      // 3. Assemble Final Note
      let finalContent = summary + '\n\n---\n\n## 原始文档引用\n\n';
      selectedNotes.forEach(n => {
          finalContent += `- [${n.title}](${n.id})\n`;
      });
      
      finalContent += '\n## 合并内容详情\n' + combinedDocs;

      const titleMatch = (summary || '').match(/^#\s+(.+)$/m);
      const extracted = titleMatch ? titleMatch[1].trim() : `Requirement ${selectedNotes.map(n => n.title).slice(0, 2).join(' & ') || 'Report'}`;
      const resolvedTitle = makeConciseRequirementTitle(extracted);
      setPreviewNote({
        title: resolvedTitle,
        content: finalContent,
        category: 'Requirement Reports',
        tags: ['Requirement'],
      });

    } catch (error: any) {
        if (error.message !== '操作已取消') {
            alert(`生成失败: ${error.message}`);
        }
    } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
    }
  };

  const handleGenerateMockNotes = () => {
    if (!onCreateNote) return;
    
    const mockTime = Date.now();
    const mockNotes: Note[] = [
        {
            id: generateId(),
            title: '[Merge] feat: User Login - Frontend',
            category: 'Git Reports',
            tags: ['GitMerge', 'frontend', 'react'],
            content: `# Merge Summary: feat: User Login - Frontend Components

## Summary
Implemented the login page UI and form components with validation.

## File Reviews
### src/pages/Login.tsx
Main login page layout with responsive design.

### src/components/LoginForm.tsx
Form component with email/password inputs and Zod validation.

## 文件更改详情

### src/pages/Login.tsx

\`\`\`typescript
import React from 'react';
import { LoginForm } from '../components/LoginForm';

export const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <LoginForm />
      </div>
    </div>
  );
};
\`\`\`

### src/components/LoginForm.tsx

\`\`\`typescript
import React, { useState } from 'react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Integrate with API
    console.log('Login', { email, password });
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email address"
        required
        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      <input 
        type="password" 
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        Sign in
      </button>
    </form>
  );
};
\`\`\`
`,
            createdAt: mockTime - 100000,
            updatedAt: mockTime - 100000,
            attachments: {}
        },
        {
            id: generateId(),
            title: '[Merge] feat: User Login - Backend API',
            category: 'Git Reports',
            tags: ['GitMerge', 'backend', 'go'],
            content: `# Merge Summary: feat: User Login - Backend API

## Summary
Added authentication endpoints and JWT token generation.

## File Reviews
### internal/handler/auth.go
Handles /api/v1/login requests.

### internal/service/auth.go
Business logic for user verification and token issuance.

## 文件更改详情

### internal/handler/auth.go

\`\`\`go
package handler

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    token, err := service.Login(req.Email, req.Password)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"token": token})
}
\`\`\`
`,
            createdAt: mockTime - 80000,
            updatedAt: mockTime - 80000,
            attachments: {}
        },
        {
            id: generateId(),
            title: '[Merge] feat: User Login - Database Schema',
            category: 'Git Reports',
            tags: ['GitMerge', 'database', 'sql'],
            content: `# Merge Summary: feat: User Login - Database Schema

## Summary
Created users table with necessary indices.

## File Reviews
### sql/schema/001_users.sql
Migration file for users table.

## 文件更改详情

### sql/schema/001_users.sql

\`\`\`sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
\`\`\`
`,
            createdAt: mockTime - 60000,
            updatedAt: mockTime - 60000,
            attachments: {}
        }
    ];
    
    mockNotes.forEach(note => onCreateNote(note));
    // onCreateNote(mockNotes);
    // Small delay to ensure state updates (though react batching might make it instant for next render)
    alert('已生成 3 条测试用的 Git 汇报数据，请在左侧列表中选择它们进行合并测试。');
  };

  const handleSelectDir = async () => {
    // 检查 window.desktop 是否存在
    if (typeof window.desktop !== 'undefined') {
      const path = await window.desktop.selectDirectory();
      if (path) {
        setRepoPath(path);
        loadRepoInfo(path);
      }
    } else {
      // Browser Mock Mode
      // alert('Git 功能通常需要在桌面端使用，但在浏览器中我们将加载虚拟测试数据供调试。');
      const mockPath = '/mock/repo/project';
      setRepoPath(mockPath);
      loadRepoInfo(mockPath);
    }
  };

  const loadRepoInfo = async (path: string, userFilter?: string) => {
    setLoading(true);
    try {
      const user = await getGitConfigUser(path);
      setGitUser(user);
      if (!filterUser && user) setFilterUser(user);
      
      const url = await getGitRemoteUrl(path);
      setRepoUrl(url);
      setParsedRepoName(url ? parseGitUrl(url) : null);

      setMerges([]);
      setPageOffset(0);
      const count = await getMergeCount(path, userFilter);
      setTotalMerges(count);
      const page = await getMergePage(path, 0, pageSize, userFilter);
      setMerges(page);
      setPageOffset(page.length);
    } catch (e) {
      console.error(e);
      alert('加载 Git 信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!repoPath) return;
    if (merges.length >= totalMerges) return;
    setLoadingMore(true);
    const page = await getMergePage(repoPath, pageOffset, pageSize, filterUser || undefined);
    setMerges(prev => [...prev, ...page]);
    setPageOffset(prev => prev + page.length);
    setLoadingMore(false);
  };

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedMerge || !repoPath) return;
      setDiffText('');
      setFileList([]);
      setStatText('');
      const info = await getMergeCommitInfo(repoPath, selectedMerge.hash);
      setCommitInfo(info);
      const files = await getMergeFiles(repoPath, selectedMerge.hash);
      setFileList(files);
      const stat = await getMergeStat(repoPath, selectedMerge.hash);
      setStatText(stat);
      const diff = await getMergeDiff(repoPath, selectedMerge.hash);
      setDiffText(diff || '');
    };
    loadDetails();
  }, [selectedMerge, repoPath]);

  const parseDiffMap = (fullDiff: string) => {
    const map: Record<string, string> = {};
    const chunks = fullDiff.split(/\n(?=diff --git )/);

    for (const chunk of chunks) {
      const cleanChunk = chunk.trim();
      if (!cleanChunk) continue;

      const match = cleanChunk.match(/^diff --git a\/(.*?) b\/(.*?)(?:\n|$)/);
      if (match) {
        const path = match[2];
        map[path.trim()] = cleanChunk;
      } else {
          const matchB = cleanChunk.match(/\+\+\+ b\/(.*?)(?:\n|$)/);
          if (matchB) {
              map[matchB[1].trim()] = cleanChunk;
          }
      }
    }
    return map;
  };

  const getFilteredData = (files: Array<{ status: string; path: string }>, diff: string, ignorePatterns: string = '') => {
    const patterns = ignorePatterns.split('\n').map(p => p.trim()).filter(p => p);
    if (patterns.length === 0) return { files, diff };

    const shouldIgnore = (path: string) => {
        return patterns.some(pattern => path === pattern || path.endsWith('/' + pattern));
    };

    const filteredFiles = files.filter(f => !shouldIgnore(f.path));
    
    // Filter diff text
    // We can use parseDiffMap logic to split and filter
    const diffChunks = diff.split(/\n(?=diff --git )/);
    const filteredDiffChunks = diffChunks.filter(chunk => {
        const cleanChunk = chunk.trim();
        if (!cleanChunk) return false;
        
        let path = '';
        const match = cleanChunk.match(/^diff --git a\/(.*?) b\/(.*?)(?:\n|$)/);
        if (match) {
            path = match[2].trim();
        } else {
            const matchB = cleanChunk.match(/\+\+\+ b\/(.*?)(?:\n|$)/);
            if (matchB) path = matchB[1].trim();
        }
        
        return path ? !shouldIgnore(path) : true; // Keep unknown chunks if any
    });

    return {
        files: filteredFiles,
        diff: filteredDiffChunks.join('\n')
    };
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'go': return 'go';
      case 'ts':
      case 'tsx': return 'typescript';
      case 'js':
      case 'jsx': return 'javascript';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'yml':
      case 'yaml': return 'yaml';
      case 'sql': return 'sql';
      case 'java': return 'java';
      case 'py': return 'python';
      case 'rs': return 'rust';
      case 'sh': return 'bash';
      case 'c':
      case 'cpp':
      case 'h': return 'cpp';
      default: return 'diff';
    }
  };

  const cleanDiffContent = (diffChunk: string): string => {
    const lines = diffChunk.split('\n');
    const cleanLines = lines.filter(line => {
      // Filter out Git metadata headers
      if (line.startsWith('diff --git ')) return false;
      if (line.startsWith('index ')) return false;
      if (line.startsWith('new file mode ')) return false;
      if (line.startsWith('deleted file mode ')) return false;
      if (line.startsWith('old mode ')) return false;
      if (line.startsWith('new mode ')) return false;
      if (line.startsWith('similarity index ')) return false;
      if (line.startsWith('rename from ')) return false;
      if (line.startsWith('rename to ')) return false;
      if (line.startsWith('copy from ')) return false;
      if (line.startsWith('copy to ')) return false;
      if (line.startsWith('--- a/')) return false;
      if (line.startsWith('+++ b/')) return false;
      // Filter out hunk headers (@@ ... @@)
      if (line.match(/^@@ -[0-9,]+ \+[0-9,]+ @@/)) return false;
      return true;
    });
    return cleanLines.join('\n').trim();
  };

  const extractDiffMetadata = (diffChunk: string): string => {
    const lines = diffChunk.split('\n');
    let metadata = '';
    for (const line of lines) {
      if (line.startsWith('new file mode')) metadata += `> ${line}\n`;
      if (line.startsWith('deleted file mode')) metadata += `> ${line}\n`;
      if (line.startsWith('rename from')) metadata += `> ${line}\n`;
      if (line.startsWith('rename to')) metadata += `> ${line}\n`;
      if (line.startsWith('copy from')) metadata += `> ${line}\n`;
      if (line.startsWith('copy to')) metadata += `> ${line}\n`;
      if (line.startsWith('similarity index')) metadata += `> ${line}\n`;
    }
    return metadata ? metadata + '\n' : '';
  };

  const handleGenerateNote = async () => {
    if (!selectedMerge || !onCreateNote || !repoPath) return;
    if (!settings.apiKey && !process.env.API_KEY && !settings.baseUrl?.includes('localhost')) {
      alert('请先在主设置中配置 API Key');
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const commitInfoStr = `Hash: ${selectedMerge.hash}\nAuthor: ${selectedMerge.author}\nEmail: ${commitInfo?.authorEmail || 'Unknown'}\nDate: ${selectedMerge.date}\nMessage: ${selectedMerge.message}`;
      
      const { files: filteredFiles, diff: filteredDiff } = getFilteredData(fileList, diffText, settings.gitIgnorePatterns);

      let diffContent = '';
      if (includeDiff) {
          // Provide a comprehensive context including file list, stats, and the actual diff
          // Wrap in JSON structure for better AI comprehension
          const filesArr = filteredFiles.map(f => `${f.status} ${f.path}`);
          
          diffContent = JSON.stringify({
            changed_files: filesArr,
            statistics: statText,
            diff_details: filteredDiff
          }, null, 2);
      } else {
          // Even without diff details, providing file list and stats is crucial for context
          const filesArr = filteredFiles.map(f => `${f.status} ${f.path}`);
          
          diffContent = JSON.stringify({
            changed_files: filesArr,
            statistics: statText,
            diff_details: "(Diff details skipped by user setting)"
          }, null, 2);
      }
      
      if (settings.userName === 'test') {
          setDebugPrompt(`System Prompt:\n${customPrompt || DEFAULT_MERGE_SUMMARY_PROMPT}\n\nUser Content:\n${commitInfoStr}\n\nDiff Content:\n${diffContent}`);
      }

      const result = await generateMergeSummary(
        diffContent,
        commitInfoStr,
        settings.apiKey,
        customPrompt,
        settings.baseUrl,
        settings.model,
        abortControllerRef.current.signal
      );

      // Debug: Show Raw Response for test user
      if (settings.userName === 'test') {
          // Append raw response to debug prompt or show in alert/console
          // For now, let's append it to the debug prompt overlay for easy viewing
          setDebugPrompt(prev => `${prev}\n\n=== AI Raw Response ===\n${result.content}`);
      }

      let parsedResult;
      try {
        // Handle Markdown response parsing
        const rawContent = result.content || '';
        
        // 1. Extract File Reviews (from "## File Reviews" to end)
        const fileReviews: Record<string, string> = {};
        const fileReviewsIndex = rawContent.indexOf('## File Reviews');
        
        let mainContent = rawContent;
        if (fileReviewsIndex !== -1) {
            mainContent = rawContent.substring(0, fileReviewsIndex).trim();
            const reviewsSection = rawContent.substring(fileReviewsIndex);
            
            // Split by "### " to get each file
            const chunks = reviewsSection.split('\n### ');
            // Skip the first chunk which is "## File Reviews" header or empty
            for (let i = 1; i < chunks.length; i++) {
                const chunk = chunks[i];
                const firstLineEnd = chunk.indexOf('\n');
                if (firstLineEnd !== -1) {
                    const filePath = chunk.substring(0, firstLineEnd).trim();
                    const review = chunk.substring(firstLineEnd).trim();
                    if (filePath && review) {
                        fileReviews[filePath] = review;
                    }
                }
            }
        }

        // 2. Extract Title (first line starting with #)
        const titleMatch = mainContent.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : `Merge Summary: ${selectedMerge.message}`;

        parsedResult = {
            title: title,
            content: mainContent,
            file_reviews: fileReviews
        };

      } catch (e) {
        console.warn('Failed to parse AI response', e);
        parsedResult = {
            title: `Merge Summary: ${selectedMerge.message}`,
            content: result.content || '生成内容为空',
            file_reviews: {}
        };
      }

      // Manually construct tags using metadata (Author, Email, Date)
      // "用户名字 merge时间 用户邮箱"
      const metaTags = ['GitMerge'];
      // User requested to remove author and email from tags
      if (selectedMerge.date) {
          // Format date as YYYY-MM-DD to be cleaner as a tag
          try {
             metaTags.push(new Date(selectedMerge.date).toISOString().split('T')[0]);
          } catch {
             metaTags.push(selectedMerge.date);
          }
      }

      // Combine parsed tags (if any exist in legacy prompts, though we removed it) with meta tags
      // If AI returns tags (e.g. keywords), we can include them too if desired, 
      // but user said "ai的tag让他解析道正文的keyword就行了". 
      // So we mainly rely on metaTags. 
      // Let's just use metaTags.
      const finalTags = metaTags;

      // Assemble final markdown content
      // 1. AI Summary
      let fullContent = parsedResult.content || '生成内容为空';
      
      // 2. File Reviews + Local Diffs
      // Check if file_reviews exists
      const fileReviews = parsedResult.file_reviews || {};
      // Use filtered diff for display
      const diffMap = parseDiffMap(filteredDiff);

      if (filteredFiles.length > 0) {
          fullContent += '\n\n## 文件更改详情\n\n';
          
          filteredFiles.forEach(file => {
              fullContent += `### ${file.path}\n\n`;
              
              // AI Review
              if (fileReviews[file.path]) {
                  fullContent += `${fileReviews[file.path]}\n\n`;
              } else if (fileReviews[file.path.split('/').pop() || '']) {
                  // Fallback match by filename only
                  fullContent += `${fileReviews[file.path.split('/').pop() || '']}\n\n`;
              }

              // Local Diff
              const localDiff = diffMap[file.path] || diffMap[file.path.split('/').pop() || ''];
              if (localDiff) {
                  const lang = getLanguageFromPath(file.path);
                  const cleanedDiff = cleanDiffContent(localDiff);
                  const metadata = extractDiffMetadata(localDiff);
                  
                  fullContent += metadata;
                  fullContent += `\`\`\`${lang}\n${cleanedDiff}\n\`\`\`\n\n`;
              } else {
                  fullContent += `> (未找到该文件的 Diff 详情)\n\n`;
              }
          });
      }

      setPreviewNote({
        title: parsedResult.title || `Merge Summary: ${selectedMerge.message}`,
        content: fullContent,
        category: parsedRepoName || repoPath.split(/[\\/]/).pop() || 'Git Reports',
        tags: finalTags,
      });
    } catch (error: any) {
      if (error.message !== '操作已取消') {
        if (error.message.includes('Raw response:') || error.message.includes('AI returned invalid JSON')) {
            setErrorDetails(error.message);
        } else {
            alert(`生成失败: ${error.message}`);
        }
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleSavePreview = () => {
    if (!previewNote || !onCreateNote) return;

    const createdAtTs = mode === 'single' && selectedMerge ? new Date(selectedMerge.date).getTime() : Date.now();
    const newNote: Note = {
        id: generateId(),
        title: previewNote.title,
        content: previewNote.content,
        category: previewNote.category,
        tags: previewNote.tags,
        createdAt: createdAtTs,
        updatedAt: Date.now(),
        attachments: {},
    };

    onCreateNote(newNote);
    setPreviewNote(null);
  };

  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleApplyFilter = () => {
    if (repoPath) loadRepoInfo(repoPath, filterUser || undefined);
  };

  const handleBranchChange = (branch: string) => {
    setCurrentBranch(branch);
    // Reload merges for the new branch
    setLoading(true);
    // Reset state
    setMerges([]);
    setPageOffset(0);
    setTotalMerges(0);
    
    // Fetch new data
    const fetchNewBranchData = async () => {
        try {
            const count = await getMergeCount(repoPath, filterUser || undefined, branch);
            setTotalMerges(count);
            const page = await getMergePage(repoPath, 0, pageSize, filterUser || undefined, branch);
            setMerges(page);
            setPageOffset(page.length);
        } catch (e) {
            console.error(e);
            alert('切换分支失败');
        } finally {
            setLoading(false);
        }
    };
    fetchNewBranchData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Debug Prompt Overlay (Only for user 'test') */}
      {debugPrompt && (
        <div className="absolute inset-0 z-[70] bg-white flex flex-col animate-in fade-in duration-200 p-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <span className="p-2 bg-slate-100 rounded-lg"><Settings size={20} /></span>
               Debug: Prompt Payload
             </h3>
             <button onClick={() => setDebugPrompt(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
               <X size={24} />
             </button>
           </div>
           <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-hidden">
             <textarea 
               readOnly
               className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-700 resize-none focus:outline-none"
               value={debugPrompt}
             />
             <div className="flex justify-end mt-4">
               <button 
                 onClick={() => { navigator.clipboard.writeText(debugPrompt); alert('已复制 Prompt'); }}
                 className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
               >
                 复制 Prompt
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Error Details Overlay */}
      {errorDetails && (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in fade-in duration-200 p-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
               <span className="p-2 bg-red-50 rounded-lg"><X size={20} /></span>
               生成失败 (AI Response Error)
             </h3>
             <button onClick={() => setErrorDetails(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
               <X size={24} />
             </button>
           </div>
           <div className="flex-1 flex flex-col min-h-0 bg-red-50/50 rounded-xl border border-red-100 p-4 overflow-hidden">
             <p className="text-sm text-red-800 mb-2 font-semibold">AI 返回了无效的 JSON 格式。以下是原始响应内容，请检查提示词或重试。</p>
             <textarea 
               readOnly
               className="flex-1 w-full bg-white border border-red-200 rounded-lg p-4 font-mono text-xs text-slate-700 resize-none focus:outline-none"
               value={errorDetails}
             />
             <div className="flex justify-end mt-4">
               <button 
                 onClick={() => { navigator.clipboard.writeText(errorDetails); alert('已复制错误信息'); }}
                 className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
               >
                 复制错误信息
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Preview Overlay */}
      {previewNote && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
           <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                   <FileText size={24} />
                </div>
                生成结果预览
             </h2>
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPreviewNote(null)}
                  className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button 
                  onClick={handleSavePreview}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-medium flex items-center gap-2"
                >
                  <Save size={16} />
                  保存笔记
                </button>
             </div>
           </div>
           
           <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">标题</label>
                    <input 
                      type="text" 
                      value={previewNote.title}
                      onChange={e => setPreviewNote({ ...previewNote, title: e.target.value })}
                      className="w-full text-lg font-bold border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                 </div>
                 
                 <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">内容</label>
                    <textarea 
                      value={previewNote.content}
                      onChange={e => setPreviewNote({ ...previewNote, content: e.target.value })}
                      className="w-full flex-1 border border-slate-200 rounded-lg p-4 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">分类</label>
                      <input 
                        type="text" 
                        value={previewNote.category}
                        onChange={e => setPreviewNote({ ...previewNote, category: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="例如: Git Reports"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">标签</label>
                      <input 
                        type="text" 
                        value={previewNote.tags.join(', ')}
                        onChange={e => setPreviewNote({ ...previewNote, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Tag1, Tag2..."
                      />
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <GitBranch size={24} />
          </div>
          Git 工作汇报
        </h2>
        
        {/* Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                单仓库汇报
            </button>
            <button 
                onClick={() => setMode('requirement')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${mode === 'requirement' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Layers size={12} />
                需求合并汇报
            </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            title="生成设置"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            title="关闭"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex relative">
        {showSettings && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-xl z-20 p-6 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-bold text-slate-800">生成设置 ({mode === 'single' ? '单仓库' : '需求合并'})</h3>
              <button onClick={() => setShowSettings(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            
            <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-1">
              {mode === 'single' ? (
                  <>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">筛选提交用户</label>
                        <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                            placeholder="输入 Git 用户名"
                            className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <button 
                            onClick={handleApplyFilter}
                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                            title="应用筛选"
                        >
                            <Filter size={16} />
                        </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">留空则显示所有用户的提交</p>
                    </div>

                    <div>
                        <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm font-medium text-slate-700">包含代码 Diff</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${includeDiff ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => setIncludeDiff(!includeDiff)}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${includeDiff ? 'left-6' : 'left-1'}`} />
                        </div>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2">开启后会将代码变更详情发送给 AI，生成更精准的技术总结。大文件可能会被截断。</p>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">自定义提示词</label>
                        <button 
                            onClick={() => {
                                const newPrompt = DEFAULT_MERGE_SUMMARY_PROMPT;
                                setCustomPrompt(newPrompt);
                                saveSettings({ ...settings, customMergePrompt: newPrompt });
                            }}
                            className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                        >
                            <RefreshCw size={10} /> 重置默认
                        </button>
                        </div>
                        <textarea 
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        onBlur={() => saveSettings({ ...settings, customMergePrompt: customPrompt })}
                        placeholder={`默认模板:\n${DEFAULT_MERGE_SUMMARY_PROMPT}`}
                        className="w-full flex-1 text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[300px]"
                        />
                    </div>
                  </>
              ) : (
                  <>
                      <div>
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm font-medium text-slate-700">忽略具体代码</span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${excludeCode ? 'bg-indigo-600' : 'bg-slate-300'}`} 
                                onClick={() => {
                                    const newValue = !excludeCode;
                                    setExcludeCode(newValue);
                                    saveSettings({ ...settings, excludeCodeInRequirement: newValue });
                                }}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${excludeCode ? 'left-6' : 'left-1'}`} />
                            </div>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-2">开启后，合并报告中将仅保留文件路径和相关评论，自动过滤掉 ```代码块```，适合生成非技术向的汇报。</p>
                      </div>
                  </>
              )}
            </div>
          </div>
        )}

        {mode === 'requirement' ? (
            <>
                {/* Left: Note Selection */}
                <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50 shrink-0">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                选择项目文档
                            </div>
                            {typeof window.desktop === 'undefined' && (
                                <button 
                                    onClick={handleGenerateMockNotes}
                                    className="text-[10px] bg-indigo-50 px-2 py-1 rounded text-indigo-600 hover:bg-indigo-100 transition-colors"
                                >
                                    + Mock 数据
                                </button>
                            )}
                        </h3>
                        <div className="mb-3 flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="搜索标题、内容或标签..."
                              className="w-full pl-7 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                          </div>
                          <div className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title={`排序：${sortBy} (${sortOrder === 'asc' ? '升序' : '降序'})`}>
                            {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                            <select
                              value={`${sortBy}:${sortOrder}`}
                              onChange={e => {
                                const [sb, so] = e.target.value.split(':') as any;
                                setSortBy(sb);
                                setSortOrder(so);
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
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 p-2">
                            {requirementCandidates.map(note => {
                            const isSelected = selectedNotes.some(sn => sn.id === note.id);
                            return (
                                <div 
                                    key={note.id} 
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedNotes(prev => prev.filter(n => n.id !== note.id));
                                        } else {
                                            setSelectedNotes(prev => [...prev, note]);
                                        }
                                    }}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="font-medium text-sm text-slate-800 line-clamp-1">{note.title}</div>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 flex gap-2">
                                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                        <span className="bg-slate-100 px-1.5 rounded">{note.category}</span>
                                    </div>
                                </div>
                            );
                        })}
                            {requirementCandidates.length === 0 && (
                                <div className="text-center text-slate-400 text-sm py-10">
                                    {baseGitCandidatesCount > 0 ? '未找到匹配的文档' : '暂未发现 Git 汇报文档，请先使用“单仓库汇报”生成。'}
                                </div>
                            )}
                    </div>
                </div>

                {/* Right: Configuration & Action */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden p-6">
                    {/* Selected List (Reorderable conceptually) */}
                    <div className="mb-4 flex-1 flex flex-col min-h-0">
                             <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-slate-700">已选文档 ({selectedNotes.length})</h3>
                             </div>
                             <div className="bg-slate-50 rounded-xl border border-slate-200 p-2 overflow-y-auto flex-1 custom-scrollbar">
                                {selectedNotes.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedNotes.map((note, idx) => (
                                            <div key={note.id} className="flex items-center gap-3 bg-white p-2 rounded border border-slate-100 shadow-sm">
                                                <span className="text-xs font-mono text-slate-400 w-5 text-center">{idx + 1}</span>
                                                <span className="text-sm text-slate-700 flex-1 truncate">{note.title}</span>
                                                <div className="flex gap-1">
                                                    <button 
                                                    disabled={idx === 0}
                                                    onClick={() => {
                                                        const newNotes = [...selectedNotes];
                                                        [newNotes[idx - 1], newNotes[idx]] = [newNotes[idx], newNotes[idx - 1]];
                                                        setSelectedNotes(newNotes);
                                                    }}
                                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button 
                                                    disabled={idx === selectedNotes.length - 1}
                                                    onClick={() => {
                                                        const newNotes = [...selectedNotes];
                                                        [newNotes[idx + 1], newNotes[idx]] = [newNotes[idx], newNotes[idx + 1]];
                                                        setSelectedNotes(newNotes);
                                                    }}
                                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                    <button 
                                                    onClick={() => setSelectedNotes(prev => prev.filter(n => n.id !== note.id))}
                                                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                        请从左侧选择文档
                                    </div>
                                )}
                            </div>
                    </div>

                    {/* Prompt & Context */}
                    <div className="h-1/2 flex flex-col gap-4">
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">AI 提示词</label>
                                <button 
                                    onClick={() => {
                                        const newPrompt = DEFAULT_REQUIREMENT_PROMPT;
                                        setRequirementPrompt(newPrompt);
                                        saveSettings({ ...settings, customRequirementPrompt: newPrompt });
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                >
                                    <RefreshCw size={10} /> 重置
                                </button>
                            </div>
                            <textarea 
                                value={requirementPrompt}
                                onChange={e => setRequirementPrompt(e.target.value)}
                                onBlur={() => saveSettings({ ...settings, customRequirementPrompt: requirementPrompt })}
                                className="flex-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-mono"
                                placeholder="输入提示词..."
                            />
                        </div>
                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1">需求文档 / 上下文</label>
                            <textarea 
                                value={requirementContext}
                                onChange={e => setRequirementContext(e.target.value)}
                                className="flex-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                placeholder="在此粘贴需求文档内容、PRD 链接或其他背景信息..."
                            />
                        </div>
                        <button
                            onClick={isGenerating ? handleCancelGenerate : handleGenerateRequirement}
                            disabled={isGenerating || selectedNotes.length === 0}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                                isGenerating || selectedNotes.length === 0 
                                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-500/30 hover:-translate-y-0.5'
                            }`}
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                            {isGenerating ? '正在汇总需求报告...' : '生成需求合并汇报'}
                        </button>
                    </div>
                </div>
            </>
        ) : (
        /* Settings Drawer */
        <>
        {/* Sidebar: Config & Merges */}
        <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50 shrink-0">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={repoPath} 
                  readOnly 
                  placeholder="请选择仓库路径"
                  className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-600 truncate cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={handleSelectDir}
                />
                <button 
                  onClick={handleSelectDir}
                  className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                  title="选择文件夹"
                >
                  <Folder size={14} />
                </button>
              </div>
              {gitUser && (
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>当前 Git 用户:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[120px]" title={gitUser}>{gitUser}</span>
                </div>
              )}
              {parsedRepoName && (
                <div className="text-xs text-slate-500 flex justify-between items-center gap-2">
                  <span className="shrink-0">远程仓库:</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <Globe size={10} />
                    <span className="font-medium text-slate-700 truncate max-w-[140px]" title={repoUrl || ''}>
                      {parsedRepoName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Branch Selector */}
            {branches.length > 0 && (
                <div className="px-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <GitBranch size={12} />
                        <span>当前分支</span>
                    </div>
                    <select 
                        value={currentBranch} 
                        onChange={(e) => handleBranchChange(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer hover:border-blue-400 transition-colors"
                        style={{ backgroundImage: 'none' }} // Remove default arrow if needed, but standard select is fine
                    >
                        {branches.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Merge 记录</h3>
                <button 
                  onClick={() => repoPath && loadRepoInfo(repoPath, filterUser || undefined)} 
                  className="text-slate-400 hover:text-blue-600"
                  title="刷新"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-1">
                  {merges.map(merge => (
                    <button
                      key={merge.hash}
                      onClick={() => setSelectedMerge(merge)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-all border ${
                        selectedMerge?.hash === merge.hash 
                          ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100' 
                          : 'border-transparent hover:bg-slate-200/50 text-slate-700'
                      }`}
                    >
                      <div className={`font-medium mb-1 line-clamp-2 ${selectedMerge?.hash === merge.hash ? 'text-blue-700' : 'text-slate-800'}`}>
                        {merge.message}
                      </div>
                      <div className="flex justify-between items-center opacity-70 text-[10px]">
                        <span>{new Date(merge.date).toLocaleDateString()}</span>
                        <span className="bg-slate-200/50 px-1 rounded">{merge.author}</span>
                      </div>
                    </button>
                  ))}
                  {merges.length === 0 && repoPath && !loading && (
                    <div className="text-center text-xs text-slate-400 py-8">未找到 Merge 记录</div>
                  )}
                  {!repoPath && (
                    <div className="text-center text-xs text-slate-400 py-8">请先选择仓库</div>
                  )}
                  {repoPath && merges.length > 0 && (
                    <div className="flex items-center justify-between mt-2 px-2">
                      <span className="text-[10px] text-slate-500">已加载 {merges.length}/{totalMerges}</span>
                      {merges.length < totalMerges && (
                        <button onClick={loadMore} className="text-xs px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600" disabled={loadingMore}>
                          {loadingMore ? '加载中...' : '加载更多'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main: Details */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
             {selectedMerge ? (
               <div className="h-full flex flex-col">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                   <div className="flex items-start justify-between gap-4">
                     <div>
                       <h3 className="text-xl font-bold text-slate-800 mb-2">{commitInfo?.message || selectedMerge.message}</h3>
                       <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                         <span className="flex items-center gap-1"><GitBranch size={14} /> {(commitInfo?.hash || selectedMerge.hash).substring(0, 7)}</span>
                         <span>Author: {commitInfo?.authorName || selectedMerge.author}</span>
                         {commitInfo?.authorEmail && <span>Email: {commitInfo.authorEmail}</span>}
                         <span>Date: {new Date(commitInfo?.date || selectedMerge.date).toLocaleString()}</span>
                       </div>
                     </div>
                     <button
                       onClick={isGenerating ? handleCancelGenerate : handleGenerateNote}
                       disabled={isGenerating}
                       className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                         isGenerating 
                           ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
                           : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                       }`}
                     >
                       {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={16} />}
                       {isGenerating ? '生成中...' : '生成总结'}
                     </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="space-y-6">
                     <div>
                       <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase mb-3 pb-2 border-b border-slate-100">
                         <FileText size={16} />
                         文件更改
                       </h4>
                       {fileList.length > 0 ? (
                         <div className="space-y-1">
                           {fileList.map(item => (
                             <div key={item.status + item.path} className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded">
                              <span className="truncate">{item.path.split('/').pop()}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-[10px] truncate max-w-[200px]">{item.path}</span>
                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600">{item.status}</span>
                              </div>
                            </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-xs text-slate-400">该 Merge 未产生文件变化</div>
                       )}
                     </div>
                     {statText && (
                       <div>
                         <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 pb-2 border-b border-slate-100">统计</h4>
                         <pre className="text-xs whitespace-pre-wrap bg-slate-50 rounded p-3 text-slate-700">{statText}</pre>
                       </div>
                     )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 pb-2 border-b border-slate-100">Diff</h4>
                      {diffText ? (
                        <div>
                          <div className="flex items-center justify-end mb-2 gap-2">
                            <button className="text-xs px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600" onClick={() => setCollapsed({})}>全部展开</button>
                            <button className="text-xs px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600" onClick={() => {
                              const map: Record<string, boolean> = {};
                              parseDiff(diffText).forEach(d => { map[d.file] = true; });
                              setCollapsed(map);
                            }}>全部折叠</button>
                          </div>
                          {parseDiff(diffText).map(d => (
                            <div key={d.file} className="mb-4 border border-slate-100 rounded overflow-hidden">
                              <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                                <div className="flex items-center gap-2 text-xs text-slate-700 flex-1 min-w-0">
                                  <span className="font-medium truncate">{d.file.split('/').pop()}</span>
                                  <span className="text-slate-400 text-[10px] truncate">{d.file}</span>
                                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600 shrink-0">{matchStatus(d.file)}</span>
                                </div>
                                <button className="text-xs px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 ml-2 shrink-0" onClick={() => setCollapsed(prev => ({ ...prev, [d.file]: !prev[d.file] }))}>{collapsed[d.file] ? '展开' : '折叠'}</button>
                              </div>
                              {!collapsed[d.file] && (
                                <SyntaxHighlighter language="diff" style={githubStyle} customStyle={{ margin: 0, borderTop: '1px solid #eef2f7' }}>
                                  {d.content}
                                </SyntaxHighlighter>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">未获取到 Diff 内容</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <GitBranch size={40} className="opacity-20" />
                 </div>
                <p className="text-lg font-medium text-slate-500">选择一个 Merge 记录开始</p>
                <p className="text-sm opacity-60 mt-2 max-w-xs text-center">选择左侧列表中的合并提交，我们将分析其变更内容并展示工作详情。</p>
               </div>
             )}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GitReportModal;
