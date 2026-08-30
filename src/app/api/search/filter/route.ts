import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runFilterSearch } from '@/lib/search/filterSearch';

export async function POST(req: NextRequest) {
  try {
    const filters = await req.json().catch(() => ({}));
    const supabase = await createClient();

    // Authenticate user if present
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { problems, total, solvedProblemIds } = await runFilterSearch(
      supabase,
      user?.id,
      filters
    );

    return NextResponse.json({
      success: true,
      problems,
      results: problems,
      solvedIds: solvedProblemIds,
      total,
    });

  } catch (error: any) {
    console.error('Filter Search API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
