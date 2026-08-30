import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const LEETCODE_API = "https://leetcode.com/graphql";
const LC_API_BASE = LEETCODE_API;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchLeetCodeSolved(username: string, sessionCookie?: string) {
  // If session cookie is available, fetch complete user status across all 4041 problems
  if (sessionCookie) {
    try {
      const response = await fetchWithTimeout('https://leetcode.com/api/problems/all/', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': `LEETCODE_SESSION=${sessionCookie}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const pairs = data.stat_status_pairs || [];
        const solvedPairs = pairs.filter((p: any) => p.status === 'ac');

        const solvedList = solvedPairs.map((p: any) => ({
          title: p.stat.question__title,
          titleSlug: p.stat.question__title_slug,
          difficulty: p.difficulty.level === 1 ? 'Easy' : p.difficulty.level === 2 ? 'Medium' : 'Hard',
          timestamp: Date.now().toString(),
        }));

        return {
          data: {
            matchedUser: {
              submitStats: {
                acSubmissionNum: [
                  { difficulty: 'All', count: solvedList.length },
                ],
              },
            },
            recentAcSubmissionList: solvedList,
            recentSubmissionList: solvedList.map((s: any) => ({ ...s, statusDisplay: 'Accepted' })),
          },
        };
      }
    } catch (err) {
      console.warn('Failed to fetch authenticated LeetCode solved list, falling back to public GraphQL:', err);
    }
  }

  const query = `
    query getUserProblems($username: String!) {
      matchedUser(username: $username) {
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }

        languageProblemCount {
          languageName
          problemsSolved
        }

        profile {
          ranking
        }
      }

      recentAcSubmissionList(username: $username, limit: 100) {
        title
        titleSlug
        timestamp
      }

      recentSubmissionList(username: $username) {
        title
        titleSlug
        statusDisplay
      }
    }
  `;

  const response = await fetch(LEETCODE_API, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  return await response.json();
}

export async function fetchLeetCodeQuestionDetails(titleSlug: string) {
  const query = `
    query getQuestionDetails($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  `;

  try {
    const response = await fetch(LEETCODE_API, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        query,
        variables: { titleSlug },
      }),
    });

    const data = await response.json();
    return data?.data?.question || null;
  } catch (error) {
    console.error(`Failed to fetch details for ${titleSlug}:`, error);
    return null;
  }
}

export async function fetchLeetCodeProblems(_limit = 4041): Promise<Problem[]> {
  try {
    const res = await fetchWithTimeout('https://leetcode.com/api/problems/all/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (res.ok) {
      const data = await res.json();
      const pairs = data.stat_status_pairs || [];
      const difficultyMap: Record<number, 'Easy' | 'Medium' | 'Hard'> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

      return pairs.map((p: any) => {
        const slug = p.stat.question__title_slug;
        const title = p.stat.question__title;
        const diffLevel = difficultyMap[p.difficulty.level] || 'Medium';

        return {
          id: `lc-${slug}`,
          platform: 'leetcode',
          platformProblemId: slug,
          title,
          url: `https://leetcode.com/problems/${slug}/`,
          difficultyLevel: diffLevel,
          difficultyRating: p.difficulty.level === 1 ? 1200 : p.difficulty.level === 2 ? 1600 : 2100,
          tags: [],
          rawTags: [],
          acceptanceRate: p.stat.total_submitted > 0 ? p.stat.total_acs / p.stat.total_submitted : null,
          isPremium: p.paid_only || false,
          metadata: { frontendId: p.stat.frontend_question_id },
        };
      });
    }
  } catch (err) {
    console.error('Failed to fetch from api/problems/all, falling back to GraphQL:', err);
  }

  // Fallback GraphQL
  const query = `
    query problemsetQuestionList {
      problemsetQuestionList: questionList(categorySlug: "", limit: 100, skip: 0, filters: {}) {
        total: totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          paidOnly: isPaidOnly
          topicTags { name }
        }
      }
    }
  `;

  const response = await fetchWithTimeout(LC_API_BASE, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  const questions = data.data?.problemsetQuestionList?.questions || [];

  return questions.map((q: any) => ({
    id: `lc-${q.titleSlug}`,
    platform: 'leetcode',
    platformProblemId: q.titleSlug,
    title: q.title,
    url: `https://leetcode.com/problems/${q.titleSlug}/`,
    difficultyLevel: q.difficulty,
    difficultyRating: q.difficulty === 'Easy' ? 1200 : q.difficulty === 'Medium' ? 1600 : 2100,
    tags: normalizeTags((q.topicTags || []).map((t: any) => t.name)),
    rawTags: (q.topicTags || []).map((t: any) => t.name),
    isPremium: q.paidOnly,
    metadata: { frontendId: q.frontendQuestionId },
  }));
}

export async function fetchLeetCodeUserSolved(username: string, sessionCookie?: string): Promise<UserSolvedProblem[]> {
  // If session cookie is provided, get full lifetime list of all solved problems
  if (sessionCookie) {
    try {
      const response = await fetchWithTimeout('https://leetcode.com/api/problems/all/', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': `LEETCODE_SESSION=${sessionCookie}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const pairs = data.stat_status_pairs || [];
        const solved = pairs.filter((p: any) => p.status === 'ac');

        return solved.map((p: any) => ({
          platform: 'leetcode',
          platformProblemId: p.stat.question__title_slug,
          solvedAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Session cookie fetch failed:', err);
    }
  }

  // Public profile fallback
  const query = `
    query recentAcSubmissions($username: String!) {
      recentAcSubmissionList(username: $username, limit: 100) {
        titleSlug
        timestamp
      }
    }
  `;

  const response = await fetchWithTimeout(LC_API_BASE, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!response.ok) return [];
  const data = await response.json();
  const submissions = data.data?.recentAcSubmissionList || [];

  return submissions.map((sub: any) => ({
    platform: 'leetcode',
    platformProblemId: sub.titleSlug,
    solvedAt: new Date(Number(sub.timestamp) * 1000).toISOString(),
  }));
}
