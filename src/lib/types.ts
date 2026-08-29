export type Platform = 'codeforces' | 'leetcode' | 'codechef' | 'hackerrank' | 'gfg';

export interface Problem {
  id: string;
  platform: Platform;
  platformProblemId: string;
  title: string;
  url: string;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  difficultyRating: number; // normalized 800-3500
  tags: string[]; // normalized canonical tags
  rawTags: string[]; // original platform tags
  acceptanceRate?: number;
  totalSolved?: number;
  isPremium?: boolean;
  metadata?: Record<string, any>;
}

export interface PlatformHandle {
  platform: Platform;
  handle: string;
  codeforcesApiKey?: string;
  codeforcesApiSecret?: string;
}

export interface UserSolvedProblem {
  platform: Platform;
  platformProblemId: string;
  solvedAt?: string;
}

export interface SearchFilters {
  platforms: Platform[];
  topics: string[];
  difficultyLevel?: 'Easy' | 'Medium' | 'Hard';
  difficultyMin?: number;
  difficultyMax?: number;
  limit?: number;
  limitPerPlatform?: number;
  excludeSolved?: boolean;
  sortBy?: 'difficulty' | 'acceptance' | 'title';
  searchText?: string;
}

export interface PlatformSyncResult {
  platform: Platform;
  problems: Problem[];
  error?: string;
  syncedAt: string;
}
