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

    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt or query is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Authenticate user (strict auth check to prevent ID spoofing)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to use AI Search.' },
        { status: 401 }
      );
    }

    const currentUserId = user.id;
    let apiKey = SYSTEM_GEMINI_API_KEY;

    // Check if user has a custom encrypted Gemini key in user_api_keys
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

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured. Please add one in Settings or set SYSTEM_GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

    // 2. Step 7B.1 — Parse prompt with Gemini
    const filters: ParsedPromptResult = await parsePrompt(userPrompt, apiKey);

    // 3. Step 7B.3 — Unsolved Problem Exclusion Logic (Single Batch Query)
    let solvedProblemIds: string[] = [];

    if (filters.unsolved) {
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

    // Platform Filter:
    // If platforms array is provided and not empty, filter by specified platforms.
    // Empty array = search every platform across OneDSA.
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

    // Limit & Deterministic Ordering
    const requestedLimit = Number(filters.limit) || 5;
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    queryBuilder = queryBuilder
      .order('difficulty', { ascending: true })
      .order('title', { ascending: true })
      .limit(limit);

    // Execute primary query
    const { data: problems, error: dbError } = await queryBuilder;

    if (dbError) {
      console.error('Supabase query error in AI Search:', dbError);
      throw dbError;
    }

    let results = problems || [];

    // Fallback: If tag matching produced 0 rows (e.g. topic phrasing like "graphs"), try a sanitized topic fallback
    if (results.length === 0 && filters.topic) {
      const topicKeyword = filters.topic
        .toLowerCase()
        .replace(/[^a-z0-9- ]/g, '')
        .trim();

      if (topicKeyword) {
        let fallbackQuery = supabase.from('problems').select('*');

        // Platform filter on fallback
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
          .order('difficulty', { ascending: true })
          .order('title', { ascending: true })
          .limit(limit);

        const { data: fallbackProblems } = await fallbackQuery;
        if (fallbackProblems && fallbackProblems.length > 0) {
          results = fallbackProblems;
        }
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
