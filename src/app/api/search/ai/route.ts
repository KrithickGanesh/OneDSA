import { NextRequest, NextResponse } from 'next/server';
import { parsePrompt, ParsedPromptResult } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';

// Fallback to system key if user hasn't provided one in settings
const SYSTEM_GEMINI_API_KEY = process.env.SYSTEM_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userPrompt = body.prompt || body.query;
    const explicitUserId = body.userId;

    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt or query is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Authenticate user & resolve API Key
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const currentUserId = user?.id || explicitUserId;
    let apiKey = SYSTEM_GEMINI_API_KEY;

    // Check if user has a custom encrypted Gemini key in user_api_keys
    if (currentUserId) {
      try {
        const { data: keyRow } = await supabase
          .from('user_api_keys')
          .select('encrypted_key, iv, auth_tag')
          .eq('user_id', currentUserId)
          .eq('provider', 'gemini')
          .maybeSingle();

        if (keyRow?.encrypted_key && keyRow?.iv && keyRow?.auth_tag) {
          apiKey = await decryptApiKey(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
        }
      } catch (err) {
        console.warn('Failed to load user Gemini API key, falling back to system key:', err);
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured. Please add one in Settings or set SYSTEM_GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

    // 2. Step 7B.1 — Parse prompt with Gemini
    const filters: ParsedPromptResult = await parsePrompt(userPrompt, apiKey);

    // 3. Step 7B.3 — Unsolved Problem Exclusion Logic
    let solvedProblemIds: string[] = [];

    if (filters.unsolved && currentUserId) {
      const { data: solvedRows } = await supabase
        .from('user_problem_status')
        .select('problem_id')
        .eq('user_id', currentUserId)
        .eq('status', 'solved');

      solvedProblemIds = solvedRows
        ?.map((row) => row.problem_id)
        .filter((id): id is string => Boolean(id)) || [];
    }

    // 4. Step 7B.2 — Build Dynamic Supabase Query
    let queryBuilder = supabase.from('problems').select('*');

    // Platform Filter
    if (filters.platforms && filters.platforms.length > 0) {
      const canonicalPlatforms = filters.platforms.map((p) => p.toLowerCase().trim());
      queryBuilder = queryBuilder.in('platform', canonicalPlatforms);
    }

    // Difficulty Filter
    if (filters.difficulty && filters.difficulty.toLowerCase() !== 'all') {
      queryBuilder = queryBuilder.ilike('difficulty', filters.difficulty);
    }

    // Topic Filter (lowercase contains on tags)
    if (filters.topic) {
      const normalizedTopic = filters.topic.toLowerCase().trim();
      queryBuilder = queryBuilder.contains('tags', [normalizedTopic]);
    }

    // Exclude Solved Problems (prevent N+1 queries)
    if (filters.unsolved && solvedProblemIds.length > 0) {
      queryBuilder = queryBuilder.not('id', 'in', `(${solvedProblemIds.join(',')})`);
    }

    // Limit Filter
    const requestedLimit = Number(filters.limit) || 5;
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    queryBuilder = queryBuilder.limit(limit);

    // Execute primary query
    const { data: problems, error: dbError } = await queryBuilder;

    if (dbError) {
      console.error('Supabase query error in AI Search:', dbError);
      throw dbError;
    }

    let results = problems || [];

    // Fallback: If tag matching produced 0 rows (e.g. topic is phrasing like "graphs"), try a looser topic fallback
    if (results.length === 0 && filters.topic) {
      const topicKeyword = filters.topic.toLowerCase().trim().replace(/s$/, ''); // e.g. "trees" -> "tree"
      let fallbackQuery = supabase.from('problems').select('*');

      if (filters.platforms && filters.platforms.length > 0) {
        fallbackQuery = fallbackQuery.in('platform', filters.platforms.map(p => p.toLowerCase()));
      }
      if (filters.difficulty && filters.difficulty.toLowerCase() !== 'all') {
        fallbackQuery = fallbackQuery.ilike('difficulty', filters.difficulty);
      }
      if (filters.unsolved && solvedProblemIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${solvedProblemIds.join(',')})`);
      }

      fallbackQuery = fallbackQuery
        .or(`title.ilike.%${topicKeyword}%,slug.ilike.%${topicKeyword}%,tags.cs.{"${topicKeyword}"}`)
        .limit(limit);

      const { data: fallbackProblems } = await fallbackQuery;
      if (fallbackProblems && fallbackProblems.length > 0) {
        results = fallbackProblems;
      }
    }

    // 5. Step 7B.4 — Format Frontend-Friendly Response
    const formattedResults = results.map((p) => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      slug: p.slug || p.platform_problem_id,
      difficulty: p.difficulty || 'Medium',
      url: p.url,
      tags: Array.isArray(p.tags) ? p.tags : [],
    }));

    return NextResponse.json({
      success: true,
      filters: {
        topic: filters.topic,
        difficulty: filters.difficulty,
        platforms: filters.platforms,
        unsolved: filters.unsolved,
        limit: filters.limit,
        similarTo: filters.similarTo,
      },
      results: formattedResults,
      problems: formattedResults,
      total: formattedResults.length,
    });

  } catch (error: any) {
    console.error('AI Search Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
