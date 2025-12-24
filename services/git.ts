export interface GitMerge {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export const getGitConfigUser = async (cwd: string) => {
  if (!window.desktop) return null;
  const res = await window.desktop.runGit(cwd, ['config', 'user.name']);
  return res.stdout?.trim() || null;
};

export const getGitRemoteUrl = async (cwd: string) => {
  if (!window.desktop) return null;
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

export const getRecentMerges = async (cwd: string, limit = 20): Promise<GitMerge[]> => {
  if (!window.desktop) return [];
  // %h: short hash, %cd: date, %s: subject, %an: author name
  // Use ISO date for easier parsing if needed, or relative date
  const res = await window.desktop.runGit(cwd, ['log', '--merges', '--pretty=format:%h|%cd|%s|%an', '-n', limit.toString()]);
  if (res.error || !res.stdout) {
    console.error('Failed to fetch merges:', res.error || res.stderr);
    return [];
  }
  
  return res.stdout.split('\n').filter(Boolean).map(line => {
    const [hash, date, message, author] = line.split('|');
    return { hash, date, message, author };
  });
};

export const getMergeDiff = async (cwd: string, hash: string): Promise<string> => {
  if (!window.desktop) return '';
  // git diff hash^ hash compares parent1 (base) with hash (result)
  const res = await window.desktop.runGit(cwd, ['diff', `${hash}^`, hash]);
  return res.stdout || '';
};
