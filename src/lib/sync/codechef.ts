import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const CC_API_BASE = 'https://www.codechef.com/api/list/problems';
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

export async function fetchCodeChefProblems(): Promise<Problem[]> {
  try {
    const url = `${CC_API_BASE}?page=0&limit=100&sort_by=difficulty_rating&sort_order=asc&search=&category=all&difficultyLevel=all`;
    const response = await fetchWithTimeout(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`CodeChef API error: ${response.status}`);
    
    const data = await response.json();
    const problemsData = data.data || [];
    const problems: Problem[] = [];

    for (const p of problemsData) {
      const rating = Number(p.difficulty_rating);
      let r = 1500;
      let level: "Easy" | "Medium" | "Hard" = "Medium";
      if(!isNaN(rating)) {
          const res = normalizeDifficulty('codechef', 'Medium', rating);
          r = res.rating;
          level = res.level;
      }
      
      const rawTags = (p.tags || []).map((t: any) => typeof t === 'string' ? t : (t.name || ''));
      
      problems.push({
        id: `cc-${p.code}`,
        platform: 'codechef',
        platformProblemId: p.code,
        title: p.name,
        url: `https://www.codechef.com/problems/${p.code}`,
        difficultyLevel: level,
        difficultyRating: r,
        tags: normalizeTags(rawTags),
        rawTags,
        totalSolved: p.successful_submissions || 0,
        isPremium: false,
      });
    }

    return problems;
  } catch (error) {
    console.error('CodeChef sync error:', error);
    return [];
  }
}

export async function fetchCodeChefUserSolved(handle: string): Promise<UserSolvedProblem[]> {
  return [];
}
