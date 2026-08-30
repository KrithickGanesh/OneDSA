import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/crypto';
import { runAISearch } from '@/lib/search/aiSearch';

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

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to use AI Search.' },
        { status: 401 }
      );
    }

    let apiKey = SYSTEM_GEMINI_API_KEY;

    // Check if user has custom encrypted Gemini key in user_api_keys
    try {
      const { data: keyRow } = await supabase
        .from('user_api_keys')
        .select('encrypted_key, iv, auth_tag')
        .eq('user_id', user.id)
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

    // 2. Execute AI Search using shared search pipeline
    const { problems, filters, total, solvedProblemIds } = await runAISearch(
      supabase,
      user.id,
      userPrompt,
      apiKey
    );

    return NextResponse.json({
      success: true,
      filters,
      results: problems,
      problems,
      solvedIds: solvedProblemIds,
      total,
    });

  } catch (error: any) {
    console.error('AI Search Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
