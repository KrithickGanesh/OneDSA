import { NextRequest, NextResponse } from 'next/server';
import { parsePrompt } from '@/lib/gemini';
import { syncAllProblems, syncUserSolvedProblems } from '@/lib/sync';
import { createClient } from '@/lib/supabase/server';
import { Problem } from '@/lib/types';

// Fallback to system key if user hasn't provided one
const SYSTEM_GEMINI_API_KEY = process.env.SYSTEM_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId, excludeSolved } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let apiKey = SYSTEM_GEMINI_API_KEY;

    // Try to get user's encrypted API key if userId is provided or from session
    if (userId) {
      try {
        const supabase = await createClient();
        const { data: keyRow } = await supabase
          .from('user_api_keys')
          .select('encrypted_key, iv, auth_tag')
          .eq('user_id', userId)
          .eq('provider', 'gemini')
          .maybeSingle();
          
        if (keyRow?.encrypted_key && keyRow?.iv && keyRow?.auth_tag) {
          const { decryptApiKey } = await import('@/lib/crypto');
          apiKey = await decryptApiKey(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
        }
      } catch (keyErr) {
        console.warn('Could not load user Gemini key, falling back to system key:', keyErr);
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const parsedFilter = await parsePrompt(query, apiKey);
    
    // Map to route filter structure
    const filters = {
      platforms: parsedFilter.platforms,
      topics: parsedFilter.topic ? [parsedFilter.topic] : [],
      difficulty_level: parsedFilter.difficulty || 'All',
      difficulty_min: null as number | null,
      difficulty_max: null as number | null,
      limit: parsedFilter.limit || 20,
      exclude_solved: excludeSolved !== undefined ? excludeSolved : parsedFilter.unsolved,
      sort_by: 'difficulty'
    };

    // Fetch problems from platforms
    // Note: In a production app, we would query a database here instead of syncing live
    const syncResults = await syncAllProblems();
    let allProblems: Problem[] = [];
    
    for (const result of syncResults) {
      if (result.problems && (!filters.platforms || filters.platforms.length === 0 || filters.platforms.includes(result.platform))) {
        allProblems = allProblems.concat(result.problems);
      }
    }

    // Apply Filters
    let filtered = allProblems;

    // 1. Difficulty Level
    if (filters.difficulty_level && filters.difficulty_level.toLowerCase() !== 'all') {
      const targetDiff = filters.difficulty_level.toLowerCase();
      filtered = filtered.filter(p => p.difficultyLevel.toLowerCase() === targetDiff);
    }

    // 2. Difficulty Range
    if (filters.difficulty_min !== null || filters.difficulty_max !== null) {
      filtered = filtered.filter(p => {
        if (!p.difficultyRating) return false;
        const min = filters.difficulty_min ?? 0;
        const max = filters.difficulty_max ?? Infinity;
        return p.difficultyRating >= min && p.difficultyRating <= max;
      });
    }

    // 3. Topics
    if (filters.topics && filters.topics.length > 0) {
      const lowercaseTopics = filters.topics.map(t => t.toLowerCase());
      filtered = filtered.filter(p => 
        p.tags.some(tag => lowercaseTopics.includes(tag.toLowerCase()))
      );
    }

    // 4. Exclude Solved (Mocking solved problems for now since we need handles)
    if (filters.exclude_solved && userId) {
      // In a real scenario, we'd fetch handles from DB, sync solved, then filter
      // For this demo, we'll skip it unless implemented
    }

    // 5. Limit
    const limit = filters.limit || 20;
    filtered = filtered.slice(0, limit);

    return NextResponse.json({
      filters,
      problems: filtered,
      total: filtered.length
    });

  } catch (error: any) {
    console.error('AI Search API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
