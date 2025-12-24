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
