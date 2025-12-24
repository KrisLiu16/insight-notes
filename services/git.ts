export interface GitMerge {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export interface GitCommitInfo {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

// Mock Data for Browser Environment
const MOCK_MERGES: GitMerge[] = [
  {
    hash: 'mock-hash-123456',
    date: new Date().toISOString(),
    message: 'Merge pull request #42 from feat/virtual-merge-test',
    author: 'Mock User',
  },
  {
    hash: 'mock-hash-789012',
    date: new Date(Date.now() - 86400000).toISOString(),
    message: 'Merge pull request #41 from fix/browser-compatibility',
    author: 'Test Bot',
  },
  {
    hash: 'mock-hash-login-fe',
    date: new Date(Date.now() - 100000).toISOString(),
    message: 'Merge pull request #50 from feat/user-login-frontend',
    author: 'Frontend Dev',
  },
  {
    hash: 'mock-hash-login-be',
    date: new Date(Date.now() - 200000).toISOString(),
    message: 'Merge pull request #49 from feat/user-login-backend',
    author: 'Backend Dev',
  },
  {
    hash: 'mock-hash-login-db',
    date: new Date(Date.now() - 300000).toISOString(),
    message: 'Merge pull request #48 from feat/user-login-schema',
    author: 'DB Admin',
  }
];

const MOCK_DIFF_MAP: Record<string, string> = {
    'mock-hash-login-fe': `diff --git a/src/pages/Login.tsx b/src/pages/Login.tsx
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/src/pages/Login.tsx
@@ -0,0 +1,12 @@
+import React from 'react';
+import { LoginForm } from '../components/LoginForm';
+
+export const LoginPage = () => {
+  return (
+    <div className="min-h-screen flex items-center justify-center bg-gray-50">
+      <div className="max-w-md w-full space-y-8">
+        <LoginForm />
+      </div>
+    </div>
+  );
+};`,
    'mock-hash-login-be': `diff --git a/internal/handler/auth.go b/internal/handler/auth.go
new file mode 100644
index 0000000..f3e2a1b
--- /dev/null
+++ b/internal/handler/auth.go
@@ -0,0 +1,15 @@
+package handler
+
+import (
+    "net/http"
+    "github.com/gin-gonic/gin"
+)
+
+func Login(c *gin.Context) {
+    // Implementation
+    c.JSON(http.StatusOK, gin.H{"token": "mock-token"})
+}`,
    'mock-hash-login-db': `diff --git a/sql/schema/001_users.sql b/sql/schema/001_users.sql
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/sql/schema/001_users.sql
@@ -0,0 +1,6 @@
+CREATE TABLE users (
+    id BIGINT AUTO_INCREMENT PRIMARY KEY,
+    email VARCHAR(255) NOT NULL UNIQUE,
+    password_hash VARCHAR(255) NOT NULL
);`
};

const MOCK_DIFF = `diff --git a/src/components/VirtualList.tsx b/src/components/VirtualList.tsx
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/src/components/VirtualList.tsx
@@ -0,0 +1,50 @@
+import React, { useState, useEffect } from 'react';
+
+export const VirtualList = ({ items }) => {
+  // Virtual list implementation
+  return <div>{items.length} items</div>;
+};
diff --git a/src/utils/helpers.ts b/src/utils/helpers.ts
index 83db48f..f3e2a1b 100644
--- a/src/utils/helpers.ts
+++ b/src/utils/helpers.ts
@@ -1,5 +1,6 @@
 export const formatDate = (date: Date) => {
-  return date.toISOString();
+  // Use locale string for better readability
+  return date.toLocaleString();
 };
+
+export const isBrowser = () => typeof window !== 'undefined' && !window.desktop;
`;

const MOCK_STAT = ` src/components/VirtualList.tsx | 50 ++++++++++++++++++++++++++++++++++++++++
 src/utils/helpers.ts         |  5 +++--
 2 files changed, 53 insertions(+), 2 deletions(-)
`;

const MOCK_FILES_MAP: Record<string, Array<{ status: string; path: string }>> = {
    'mock-hash-login-fe': [{ status: 'A', path: 'src/pages/Login.tsx' }],
    'mock-hash-login-be': [{ status: 'A', path: 'internal/handler/auth.go' }],
    'mock-hash-login-db': [{ status: 'A', path: 'sql/schema/001_users.sql' }]
};

const MOCK_FILES = [
  { status: 'A', path: 'src/components/VirtualList.tsx' },
  { status: 'M', path: 'src/utils/helpers.ts' }
];

const MOCK_COMMIT_INFO_MAP: Record<string, GitCommitInfo> = {
    'mock-hash-login-fe': {
        hash: 'mock-hash-login-fe',
        authorName: 'Frontend Dev',
        authorEmail: 'fe@example.com',
        date: new Date(Date.now() - 100000).toISOString(),
        message: 'feat: User Login - Frontend'
    },
    'mock-hash-login-be': {
        hash: 'mock-hash-login-be',
        authorName: 'Backend Dev',
        authorEmail: 'be@example.com',
        date: new Date(Date.now() - 200000).toISOString(),
        message: 'feat: User Login - Backend API'
    },
    'mock-hash-login-db': {
        hash: 'mock-hash-login-db',
        authorName: 'DB Admin',
        authorEmail: 'dba@example.com',
        date: new Date(Date.now() - 300000).toISOString(),
        message: 'feat: User Login - Database Schema'
    }
};

const MOCK_COMMIT_INFO: GitCommitInfo = {
  hash: 'mock-hash-123456',
  authorName: 'Mock User',
  authorEmail: 'mock@example.com',
  date: new Date().toISOString(),
  message: 'Merge pull request #42 from feat/virtual-merge-test',
};

export const getGitConfigUser = async (cwd: string) => {
  if (!window.desktop) return 'Mock User';
  const res = await window.desktop.runGit(cwd, ['config', 'user.name']);
  return res.stdout?.trim() || null;
};

export const getGitRemoteUrl = async (cwd: string) => {
  if (!window.desktop) return 'https://github.com/mock-group/mock-repo.git';
  const res = await window.desktop.runGit(cwd, ['config', '--get', 'remote.origin.url']);
  return res.stdout?.trim() || null;
};

export const parseGitUrl = (url: string) => {
  // Matches:
  // git@code.byted.org:group/repo.git
  // https://github.com/group/repo.git
  // ssh://git@...
  try {
    let repo = url;
    // Remove .git suffix
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);
    
    // Handle SSH scp-like syntax (git@host:path)
    if (repo.includes('@') && repo.includes(':')) {
      const parts = repo.split(':');
      if (parts.length > 1) {
        return parts[1]; // Return path part (group/repo)
      }
    }
    
    // Handle URLs
    if (repo.startsWith('http') || repo.startsWith('ssh://')) {
      const urlObj = new URL(repo);
      return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    }
    
    return repo;
  } catch (e) {
    return url;
  }
};

export const getAllMerges = async (cwd: string): Promise<GitMerge[]> => {
  if (!window.desktop) return MOCK_MERGES;
  const res = await window.desktop.runGit(cwd, ['log', '--merges', '--pretty=format:%H|%cI|%s|%an']);
  if (res.error || !res.stdout) return [];
  return res.stdout.split('\n').filter(Boolean).map(line => {
    const [hash, date, message, author] = line.split('|');
    return { hash, date, message, author };
  });
};

export const getBranches = async (cwd: string): Promise<{ current: string; all: string[] }> => {
  if (!window.desktop) return { current: 'master', all: ['master', 'develop', 'feat/test'] };
  const res = await window.desktop.runGit(cwd, ['branch', '--sort=-committerdate']);
  if (res.error || !res.stdout) return { current: '', all: [] };
  
  const lines = res.stdout.split('\n').filter(Boolean);
  let current = '';
  const all: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ')) {
      const name = trimmed.substring(2);
      current = name;
      all.push(name);
    } else {
      all.push(trimmed);
    }
  });
  
  return { current, all };
};

export const getMergeCount = async (cwd: string, author?: string, branch: string = 'HEAD'): Promise<number> => {
  if (!window.desktop) return MOCK_MERGES.length;
  const args = ['rev-list', '--count', '--merges', branch];
  if (author) {
    args.splice(3, 0, `--author=${author}`);
  }
  const res = await window.desktop.runGit(cwd, args);
  if (res.error || !res.stdout) return 0;
  const n = parseInt(res.stdout.trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

export const getMergePage = async (cwd: string, offset: number, limit: number, author?: string, branch: string = 'HEAD'): Promise<GitMerge[]> => {
  if (!window.desktop) return MOCK_MERGES.slice(offset, offset + limit);
  const args = ['log', '--merges', '--pretty=format:%H|%cI|%s|%an', '-n', String(limit), '--skip', String(offset), branch];
  if (author) {
    // Insert before branch
    args.splice(args.length - 1, 0, `--author=${author}`);
  }
  const res = await window.desktop.runGit(cwd, args);
  if (res.error || !res.stdout) return [];
  return res.stdout.split('\n').filter(Boolean).map(line => {
    const [hash, date, message, author] = line.split('|');
    return { hash, date, message, author };
  });
};

export const getMergeDiff = async (cwd: string, hash: string): Promise<string> => {
  if (!window.desktop) return MOCK_DIFF_MAP[hash] || MOCK_DIFF;
  // git diff hash^ hash compares parent1 (base) with hash (result)
  const res = await window.desktop.runGit(cwd, ['diff', `${hash}^`, hash]);
  return res.stdout || '';
};

export const getMergeCommitInfo = async (cwd: string, hash: string): Promise<GitCommitInfo | null> => {
  if (!window.desktop) return { ...(MOCK_COMMIT_INFO_MAP[hash] || MOCK_COMMIT_INFO), hash: hash };
  const res = await window.desktop.runGit(cwd, ['show', '-s', '--pretty=format:%H|%an|%ae|%cI|%s', hash]);
  if (res.error || !res.stdout) return null;
  const [h, an, ae, date, msg] = res.stdout.trim().split('|');
  return { hash: h, authorName: an, authorEmail: ae, date, message: msg };
};

export const getMergeFiles = async (cwd: string, hash: string): Promise<Array<{ status: string; path: string }>> => {
  if (!window.desktop) return MOCK_FILES_MAP[hash] || MOCK_FILES;
  const res = await window.desktop.runGit(cwd, ['diff', '--name-status', `${hash}^`, hash]);
  if (res.error || !res.stdout) return [];
  return res.stdout.split('\n').filter(Boolean).map(line => {
    const [status, ...rest] = line.split(/\s+/);
    return { status, path: rest.join(' ') };
  });
};

export const getMergeStat = async (cwd: string, hash: string): Promise<string> => {
  if (!window.desktop) return MOCK_STAT;
  const res = await window.desktop.runGit(cwd, ['diff', '--stat', `${hash}^`, hash]);
  return res.stdout || '';
};
