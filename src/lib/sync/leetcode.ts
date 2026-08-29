import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

const LEETCODE_API = "https://leetcode.com/graphql";
const LC_API_BASE = LEETCODE_API;
const HEADERS = {
  'User-Agent': 'OneDSA-Bot/1.0',
  'Content-Type': 'application/json',
};

export async function fetchLeetCodeSolved(username: string) {
  const query = `
    query getUser($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  const response = await fetch(LEETCODE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  const data = await response.json();
  return data;
}


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

export async function fetchLeetCodeProblems(limit = 3000): Promise<Problem[]> {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          paidOnly: isPaidOnly
          acRate
          topicTags {
            name
          }
        }
      }
    }
  `;

  const variables = {
    categorySlug: "",
    skip: 0,
    limit,
    filters: {}
  };

  const response = await fetchWithTimeout(LC_API_BASE, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`LeetCode API error: ${response.status}`);
  const data = await response.json();

  if (data.errors) throw new Error(`LeetCode GraphQL error: ${data.errors[0].message}`);

  const questions = data.data.problemsetQuestionList.questions;
  const problems: Problem[] = [];

  for (const q of questions) {
    const { level, rating } = normalizeDifficulty('leetcode', q.difficulty);
    const rawTags = (q.topicTags || []).map((t: any) => t.name);
    
    problems.push({
      id: `lc-${q.titleSlug}`,
      platform: 'leetcode',
      platformProblemId: q.titleSlug,
      title: q.title,
      url: `https://leetcode.com/problems/${q.titleSlug}/`,
      difficultyLevel: level,
      difficultyRating: rating,
      tags: normalizeTags(rawTags),
      rawTags,
      acceptanceRate: q.acRate,
      isPremium: q.paidOnly,
      metadata: { frontendId: q.frontendQuestionId },
    });
  }

  return problems;
}

export async function fetchLeetCodeUserSolved(username: string): Promise<UserSolvedProblem[]> {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        titleSlug
        timestamp
      }
    }
  `;

  const variables = {
    username,
    limit: 100 
  };

  const response = await fetchWithTimeout(LC_API_BASE, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`LeetCode API error: ${response.status}`);
  const data = await response.json();

  if (data.errors) throw new Error(`LeetCode GraphQL error: ${data.errors[0].message}`);

  const submissions = data.data.recentAcSubmissionList || [];
  const userSolvedProblems: UserSolvedProblem[] = submissions.map((sub: any) => ({
    platform: 'leetcode',
    platformProblemId: sub.titleSlug,
    solvedAt: new Date(Number(sub.timestamp) * 1000).toISOString(),
  }));

  const unique = new Map<string, UserSolvedProblem>();
  for (const s of userSolvedProblems) {
    if (!unique.has(s.platformProblemId)) {
      unique.set(s.platformProblemId, s);
    }
  }

  return Array.from(unique.values());
}
