import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const HR_API_BASE = 'https://www.hackerrank.com/rest';
const HEADERS = {
  'User-Agent': 'OneDSA-Bot/1.0',
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchHackerRankProblems(): Promise<Problem[]> {
  const tracks = ['algorithms', 'data-structures', 'mathematics'];
  const problems: Problem[] = [];

  for (const track of tracks) {
    try {
      const url = `${HR_API_BASE}/contests/master/tracks/${track}/challenges?offset=0&limit=200`;
      const response = await fetchWithTimeout(url, { headers: HEADERS });
      if (!response.ok) continue;
      
      const data = await response.json();
      const models = data.models || [];
      
      for (const m of models) {
        const difficulty = m.difficulty_name || 'Medium';
        const { level, rating } = normalizeDifficulty('hackerrank', difficulty);
        const rawTags = [m.track?.name, m.track_category?.name].filter(Boolean) as string[];
        
        problems.push({
          id: `hr-${m.slug}`,
          platform: 'hackerrank',
          platformProblemId: m.slug,
          title: m.name,
          url: `https://www.hackerrank.com/challenges/${m.slug}/problem`,
          difficultyLevel: level,
          difficultyRating: rating,
          tags: normalizeTags(rawTags),
          rawTags,
          totalSolved: m.solved_count || 0,
          isPremium: false,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch HackerRank track ${track}:`, error);
    }
  }

  const unique = new Map<string, Problem>();
  for (const p of problems) {
    if (!unique.has(p.platformProblemId)) {
      unique.set(p.platformProblemId, p);
    }
  }

  return Array.from(unique.values());
}

export async function fetchHackerRankUserSolved(username: string): Promise<UserSolvedProblem[]> {
  return [];
}
