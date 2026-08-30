import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { platform = 'leetcode', data: importData } = body;

    if (!importData) {
      return NextResponse.json({ success: false, error: 'importData is required' }, { status: 400 });
    }

    // 1. Extract slugs from text, json array, or URLs
    let slugs: string[] = [];

    if (Array.isArray(importData)) {
      slugs = importData.map((s: string) => String(s).trim().toLowerCase());
    } else if (typeof importData === 'string') {
      // Split by comma, newline, whitespace or extract from URLs
      const lines = importData.split(/[\n,;\s]+/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if URL like https://leetcode.com/problems/two-sum/
        const urlMatch = trimmed.match(/problems\/([a-z0-9-]+)/i);
        if (urlMatch) {
          slugs.push(urlMatch[1].toLowerCase());
        } else {
          // Normalize slug
          const cleanSlug = trimmed.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          if (cleanSlug) {
            slugs.push(cleanSlug);
          }
        }
      }
    }

    const uniqueSlugs = Array.from(new Set(slugs));

    if (uniqueSlugs.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid problem slugs could be parsed' }, { status: 400 });
    }

    // 2. Lookup problem IDs in problems table
    const { data: matchedProblems, error: matchError } = await supabase
      .from('problems')
      .select('id, slug, platform_problem_id')
      .eq('platform', platform)
      .or(`slug.in.(${uniqueSlugs.map(s => `"${s}"`).join(',')}),platform_problem_id.in.(${uniqueSlugs.map(s => `"${s}"`).join(',')})`);

    if (matchError) {
      console.error('Error matching problems in DB:', matchError);
    }

    const foundProblems = matchedProblems || [];
    const foundSlugs = new Set(foundProblems.map(p => p.slug || p.platform_problem_id));

    // 3. For any problems not yet in DB, create them as stub entries
    const missingSlugs = uniqueSlugs.filter(s => !foundSlugs.has(s));
    const createdProblems: any[] = [];

    if (missingSlugs.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < missingSlugs.length; i += BATCH_SIZE) {
        const batch = missingSlugs.slice(i, i + BATCH_SIZE).map(slug => {
          const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return {
            platform,
            platform_problem_id: slug,
            title,
            slug,
            difficulty: 'Medium',
            tags: [],
            url: platform === 'leetcode' ? `https://leetcode.com/problems/${slug}/` : `https://codeforces.com/problemset/problem/${slug}`,
          };
        });

        const { data: inserted, error: insertError } = await supabase
          .from('problems')
          .upsert(batch, { onConflict: 'platform,platform_problem_id' })
          .select('id, slug, platform_problem_id');

        if (!insertError && inserted) {
          createdProblems.push(...inserted);
        }
      }
    }

    const allToMark = [...foundProblems, ...createdProblems];

    // 4. Mark all as solved in user_problem_status
    let markedCount = 0;
    const BATCH = 50;
    for (let i = 0; i < allToMark.length; i += BATCH) {
      const batch = allToMark.slice(i, i + BATCH).map(p => ({
        user_id: user.id,
        problem_id: p.id,
        status: 'solved',
        solved_at: new Date().toISOString(),
      }));

      const { error: statusError } = await supabase
        .from('user_problem_status')
        .upsert(batch, { onConflict: 'user_id,problem_id' });

      if (!statusError) {
        markedCount += batch.length;
      }
    }

    // 5. Record sync_history
    try {
      await supabase.from('sync_history').insert({
        user_id: user.id,
        platform,
        synced_count: markedCount,
        status: 'completed',
        synced_at: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      totalParsed: uniqueSlugs.length,
      markedSolved: markedCount,
      message: `Successfully imported and marked ${markedCount} problems as solved on ${platform}!`,
    });
  } catch (error: any) {
    console.error('Import Solved Problems Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
