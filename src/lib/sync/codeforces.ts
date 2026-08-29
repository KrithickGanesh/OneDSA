import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const CF_API_BASE = 'https://codeforces.com/api';
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

export async function fetchCodeforcesProblems(): Promise<Problem[]> {
  const url = `${CF_API_BASE}/problemset.problems`;
  const response = await fetchWithTimeout(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`Codeforces API error: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'OK') throw new Error(`Codeforces API error: ${data.comment}`);

  const problems: Problem[] = [];
  const { problems: cfProblems, problemStatistics } = data.result;

  const statsMap = new Map();
  for (const stat of problemStatistics) {
    statsMap.set(`${stat.contestId}${stat.index}`, stat.solvedCount);
  }

  for (const p of cfProblems) {
    if (!p.contestId) continue;
    const problemId = `${p.contestId}${p.index}`;
    const { level, rating } = normalizeDifficulty('codeforces', p.rating || 'Medium', p.rating);
    const totalSolved = statsMap.get(problemId) || 0;

    problems.push({
      id: `cf-${problemId}`,
      platform: 'codeforces',
      platformProblemId: problemId,
      title: p.name,
      url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      difficultyLevel: level,
      difficultyRating: rating,
      tags: normalizeTags(p.tags || []),
      rawTags: p.tags || [],
      totalSolved,
      isPremium: false,
    });
  }

  return problems;
}

export async function fetchCodeforcesUserSolved(handle: string): Promise<UserSolvedProblem[]> {
  const url = `${CF_API_BASE}/user.status?handle=${handle}`;
  const response = await fetchWithTimeout(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`Codeforces API error: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'OK') throw new Error(`Codeforces API error: ${data.comment}`);

  const solved = new Set<string>();
  const userSolvedProblems: UserSolvedProblem[] = [];

  for (const sub of data.result) {
    if (sub.verdict === 'OK' && sub.problem && sub.problem.contestId) {
      const problemId = `${sub.problem.contestId}${sub.problem.index}`;
      if (!solved.has(problemId)) {
        solved.add(problemId);
        userSolvedProblems.push({
          platform: 'codeforces',
          platformProblemId: problemId,
          solvedAt: new Date(sub.creationTimeSeconds * 1000).toISOString(),
        });
      }
    }
  }

  return userSolvedProblems;
}
