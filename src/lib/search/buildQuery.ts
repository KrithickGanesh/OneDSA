import { SupabaseClient } from '@supabase/supabase-js';
import { Problem } from '@/lib/types';

export interface SearchFilterParams {
  topic?: string | null;
  topics?: string[];
  difficulty?: string | null;
  difficulty_level?: string | null;
  difficulty_min?: number | null;
  difficulty_max?: number | null;
  platforms?: string[];
  unsolved?: boolean;
  exclude_solved?: boolean;
  solved_only?: boolean;
  limit?: number;
  sort_by?: 'difficulty' | 'title' | 'acceptance' | 'rating';
  similarTo?: string | null;
}

export interface SearchExecutionResult {
  problems: Problem[];
  total: number;
  solvedProblemIds: string[];
}

export async function executeSearchQuery(
  supabase: SupabaseClient,
  userId: string | undefined,
  params: SearchFilterParams
): Promise<SearchExecutionResult> {
  // 1. Fetch user's solved problem IDs from user_problem_status
  let solvedProblemIds: string[] = [];
  if (userId) {
    const { data: statusRows } = await supabase
      .from('user_problem_status')
      .select('problem_id')
      .eq('user_id', userId)
      .eq('status', 'solved');

    solvedProblemIds = (statusRows || [])
      .map((r: any) => r.problem_id)
      .filter((id: any): id is string => Boolean(id));
  }

  // Default to excluding solved problems unless explicitly requested to include them or filter solved only
  const shouldExcludeSolved = (params.unsolved !== false && params.exclude_solved !== false) && !params.solved_only;
  const shouldFilterSolvedOnly = Boolean(params.solved_only);

  // 2. Build Supabase query on problems table
  let queryBuilder = supabase.from('problems').select('*');

  // Platform Filter:
  // If platforms array is provided and not empty, filter by specified platforms.
  // Empty array = search every platform across OneDSA.
  if (params.platforms && params.platforms.length > 0) {
    const canonicalPlatforms = params.platforms.map((p) => p.toLowerCase().trim());
    queryBuilder = queryBuilder.in('platform', canonicalPlatforms);
  }

  // Difficulty Filter
  const targetDifficulty = params.difficulty || params.difficulty_level;
  if (targetDifficulty && targetDifficulty.toLowerCase() !== 'all') {
    queryBuilder = queryBuilder.ilike('difficulty', targetDifficulty.trim());
  }

  // Topic Filter: Normalize to lowercase tag array containment
  const rawTopics: string[] = [];
  if (params.topic) rawTopics.push(params.topic);
  if (params.topics && Array.isArray(params.topics)) rawTopics.push(...params.topics);

  const normalizedTopics = rawTopics
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);

  if (normalizedTopics.length > 0) {
    // PostgREST contains filter on array
    queryBuilder = queryBuilder.contains('tags', [normalizedTopics[0]]);
  }

  // Solved status filtering
  if (shouldExcludeSolved && solvedProblemIds.length > 0) {
    queryBuilder = queryBuilder.not('id', 'in', `(${solvedProblemIds.join(',')})`);
  } else if (shouldFilterSolvedOnly) {
    if (solvedProblemIds.length === 0) {
      return { problems: [], total: 0, solvedProblemIds: [] };
    }
    queryBuilder = queryBuilder.in('id', solvedProblemIds);
  }

  // Limit & Deterministic Ordering
  const requestedLimit = Number(params.limit) || 20;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);

  if (params.sort_by === 'title') {
    queryBuilder = queryBuilder.order('title', { ascending: true });
  } else {
    queryBuilder = queryBuilder
      .order('difficulty', { ascending: true })
      .order('title', { ascending: true });
  }

  queryBuilder = queryBuilder.limit(limit);

  // Execute primary query
  const { data: problems, error: dbError } = await queryBuilder;

  if (dbError) {
    console.error('Supabase search query error:', dbError);
    throw dbError;
  }

  let results = problems || [];

  // Fallback: If tag matching produced 0 rows (e.g. user entered "trees" or specific concept), try title/slug/tag search
  if (results.length === 0 && normalizedTopics.length > 0) {
    const topicKeyword = normalizedTopics[0]
      .replace(/[^a-z0-9- ]/g, '')
      .trim();

    if (topicKeyword) {
      let fallbackQuery = supabase.from('problems').select('*');

      if (params.platforms && params.platforms.length > 0) {
        fallbackQuery = fallbackQuery.in(
          'platform',
          params.platforms.map((p) => p.toLowerCase().trim())
        );
      }
      if (targetDifficulty && targetDifficulty.toLowerCase() !== 'all') {
        fallbackQuery = fallbackQuery.ilike('difficulty', targetDifficulty.trim());
      }
      if (shouldExcludeSolved && solvedProblemIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${solvedProblemIds.join(',')})`);
      } else if (shouldFilterSolvedOnly && solvedProblemIds.length > 0) {
        fallbackQuery = fallbackQuery.in('id', solvedProblemIds);
      }

      fallbackQuery = fallbackQuery
        .or(`title.ilike.%${topicKeyword}%,slug.ilike.%${topicKeyword}%,tags.cs.{"${topicKeyword}"}`)
        .order('difficulty', { ascending: true })
        .order('title', { ascending: true })
        .limit(limit);

      const { data: fallbackProblems } = await fallbackQuery;
      if (fallbackProblems && fallbackProblems.length > 0) {
        results = fallbackProblems;
      }
    }
  }

  // Format into canonical Problem interface
  const formattedProblems: Problem[] = results.map((p) => ({
    id: p.id,
    platform: p.platform as any,
    platformProblemId: p.platform_problem_id || p.slug || p.id,
    title: p.title,
    url: p.url,
    difficultyLevel: (p.difficulty || 'Medium') as any,
    difficultyRating: p.difficulty_rating || null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    rawTags: Array.isArray(p.tags) ? p.tags : [],
    acceptanceRate: p.acceptance_rate || null,
    isPremium: p.is_paid || false,
    metadata: { slug: p.slug },
  }));

  return {
    problems: formattedProblems,
    total: formattedProblems.length,
    solvedProblemIds,
  };
}
