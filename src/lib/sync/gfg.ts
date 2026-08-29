import { Problem, UserSolvedProblem } from '../types';
import { normalizeDifficulty, normalizeTags } from './normalize';

export async function fetchGFGProblems(): Promise<Problem[]> {
  const curated = [
    {
      problemId: 'subarray-with-given-sum-1587115621',
      title: 'Subarray with given sum',
      difficulty: 'Easy',
      tags: ['array', 'sliding-window']
    },
    {
      problemId: 'missing-number-in-array1416',
      title: 'Missing number in array',
      difficulty: 'Easy',
      tags: ['array', 'math']
    },
    {
      problemId: 'kadanes-algorithm-1587115620',
      title: 'Kadane\'s Algorithm',
      difficulty: 'Medium',
      tags: ['array', 'dynamic-programming']
    }
  ];

  const problems: Problem[] = curated.map(c => {
    const { level, rating } = normalizeDifficulty('gfg', c.difficulty);
    return {
      id: `gfg-${c.problemId}`,
      platform: 'gfg',
      platformProblemId: c.problemId,
      title: c.title,
      url: `https://practice.geeksforgeeks.org/problems/${c.problemId}/1`,
      difficultyLevel: level,
      difficultyRating: rating,
      tags: normalizeTags(c.tags),
      rawTags: c.tags,
      isPremium: false,
    };
  });

  return problems;
}

export async function fetchGFGUserSolved(handle: string): Promise<UserSolvedProblem[]> {
  return [];
}
