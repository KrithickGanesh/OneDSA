import { PlatformHandle, PlatformSyncResult, Problem, UserSolvedProblem } from '../types';
import { fetchCodeforcesProblems, fetchCodeforcesUserSolved } from './codeforces';
import { fetchLeetCodeProblems, fetchLeetCodeUserSolved } from './leetcode';
import { fetchHackerRankProblems, fetchHackerRankUserSolved } from './hackerrank';
import { fetchCodeChefProblems, fetchCodeChefUserSolved } from './codechef';
import { fetchGFGProblems, fetchGFGUserSolved } from './gfg';

export async function syncAllProblems(): Promise<PlatformSyncResult[]> {
  const syncPromises = [
    runSync('codeforces', fetchCodeforcesProblems),
    runSync('leetcode', fetchLeetCodeProblems),
    runSync('hackerrank', fetchHackerRankProblems),
    runSync('codechef', fetchCodeChefProblems),
    runSync('gfg', fetchGFGProblems),
  ];

  return Promise.all(syncPromises);
}

async function runSync(platform: string, fetchFn: () => Promise<Problem[]>): Promise<PlatformSyncResult> {
  try {
    const problems = await fetchFn();
    return {
      platform: platform as any,
      problems,
      syncedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error(`Error syncing ${platform}:`, error);
    return {
      platform: platform as any,
      problems: [],
      error: error.message,
      syncedAt: new Date().toISOString(),
    };
  }
}

export async function syncUserSolvedProblems(handles: PlatformHandle[]): Promise<UserSolvedProblem[]> {
  const promises = handles.map(async (h) => {
    try {
      switch (h.platform) {
        case 'codeforces':
          return await fetchCodeforcesUserSolved(h.handle);
        case 'leetcode':
          return await fetchLeetCodeUserSolved(h.handle);
        case 'hackerrank':
          return await fetchHackerRankUserSolved(h.handle);
        case 'codechef':
          return await fetchCodeChefUserSolved(h.handle);
        case 'gfg':
          return await fetchGFGUserSolved(h.handle);
        default:
          return [];
      }
    } catch (error) {
      console.error(`Failed to sync solved problems for ${h.platform} handle ${h.handle}:`, error);
      return [];
    }
  });

  const results = await Promise.all(promises);
  return results.flat();
}
