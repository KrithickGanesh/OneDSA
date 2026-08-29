import { Platform } from '../types';

export const TAG_CANONICAL_MAP: Record<string, string> = {
  'dp': 'dynamic-programming',
  'dynamic programming': 'dynamic-programming',
  'dfs': 'depth-first-search',
  'dfs and similar': 'depth-first-search',
  'bfs': 'breadth-first-search',
  'trees': 'tree',
  'binary tree': 'tree',
  'binary search tree': 'bst',
  'graphs': 'graph',
  'hash map': 'hashing',
  'hash table': 'hashing',
  'math': 'mathematics',
  'maths': 'mathematics',
  'number theory': 'mathematics',
  'greedy algorithms': 'greedy',
  'strings': 'string',
  'arrays': 'array',
  'two pointers': 'two-pointers',
  '2 pointers': 'two-pointers',
  'dsu': 'disjoint-set',
  'union find': 'disjoint-set',
  'bit manipulation': 'bitmask',
  'bitmasks': 'bitmask',
  'sliding window': 'sliding-window',
  'stack': 'stack',
  'queue': 'queue',
  'priority queue': 'heap',
  'heap (priority queue)': 'heap',
  'binary search': 'binary-search',
  'divide and conquer': 'divide-and-conquer',
  'backtracking': 'backtracking',
  'trie': 'trie',
  'geometry': 'geometry',
  'implementation': 'implementation',
  'sortings': 'sorting',
  'brute force': 'brute-force',
  'constructive algorithms': 'constructive',
  'shortest paths': 'shortest-path',
  'combinatorics': 'combinatorics',
  'two pointer': 'two-pointers',
};

export function normalizeTag(rawTag: string): string {
  const lowercase = rawTag.toLowerCase().trim();
  return TAG_CANONICAL_MAP[lowercase] || lowercase.replace(/\s+/g, '-');
}

export function normalizeTags(rawTags: string[]): string[] {
  const normalized = rawTags.map(normalizeTag);
  return Array.from(new Set(normalized));
}

export function normalizeDifficulty(
  platform: Platform,
  rawDifficulty: string | number,
  rawRating?: number
): { level: 'Easy' | 'Medium' | 'Hard'; rating: number } {
  if (platform === 'codeforces') {
    const r = typeof rawRating === 'number' ? rawRating : 1200;
    let level: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (r < 1200) level = 'Easy';
    else if (r > 1900) level = 'Hard';
    return { level, rating: r };
  }

  if (platform === 'leetcode') {
    const diff = String(rawDifficulty).toLowerCase();
    if (diff === 'hard') return { level: 'Hard', rating: 2200 };
    if (diff === 'medium') return { level: 'Medium', rating: 1500 };
    return { level: 'Easy', rating: 1000 };
  }

  if (platform === 'hackerrank') {
    const diff = String(rawDifficulty).toLowerCase();
    if (diff === 'hard' || diff === 'advanced') return { level: 'Hard', rating: 2200 };
    if (diff === 'medium') return { level: 'Medium', rating: 1500 };
    return { level: 'Easy', rating: 1000 };
  }

  if (platform === 'codechef') {
    if (typeof rawRating === 'number') {
      let level: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (rawRating < 1200) level = 'Easy';
      else if (rawRating > 1800) level = 'Hard';
      return { level, rating: rawRating };
    }
    const diff = String(rawDifficulty).toLowerCase();
    if (diff.includes('hard')) return { level: 'Hard', rating: 2200 };
    if (diff.includes('medium')) return { level: 'Medium', rating: 1500 };
    return { level: 'Easy', rating: 1000 };
  }

  if (platform === 'gfg') {
    const diff = String(rawDifficulty).toLowerCase();
    if (diff.includes('hard')) return { level: 'Hard', rating: 2200 };
    if (diff.includes('medium')) return { level: 'Medium', rating: 1600 };
    if (diff.includes('easy')) return { level: 'Easy', rating: 1200 };
    if (diff.includes('basic')) return { level: 'Easy', rating: 1000 };
    if (diff.includes('school')) return { level: 'Easy', rating: 800 };
    return { level: 'Medium', rating: 1500 };
  }

  return { level: 'Medium', rating: 1500 };
}
