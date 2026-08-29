import { NextRequest, NextResponse } from 'next/server';
import { syncAllProblems } from '@/lib/sync';
import { Problem } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const filters = await req.json();
    
    // Fetch all problems (mocked as live sync for now)
    // Production app would query DB here
    const syncResults = await syncAllProblems();
    let allProblems: Problem[] = [];
    
    for (const result of syncResults) {
      if (result.problems) {
        allProblems = allProblems.concat(result.problems);
      }
    }

    let filtered = allProblems;

    // 1. Platform Filter
    if (filters.platforms && filters.platforms.length > 0) {
      filtered = filtered.filter(p => filters.platforms.includes(p.platform));
    }

    // 2. Topic Filter
    if (filters.topics && filters.topics.length > 0) {
      const targetTopics = filters.topics.map((t: string) => t.toLowerCase());
      filtered = filtered.filter(p => 
        p.tags.some(tag => targetTopics.includes(tag.toLowerCase()))
      );
    }

    // 3. Difficulty Level Filter
    if (filters.difficulty_level && filters.difficulty_level.toLowerCase() !== 'all') {
      const targetDiff = filters.difficulty_level.toLowerCase();
      filtered = filtered.filter(p => p.difficultyLevel.toLowerCase() === targetDiff);
    }

    // 4. Difficulty Range Filter
    if (filters.difficulty_min !== null && filters.difficulty_max !== null) {
      filtered = filtered.filter(p => {
        if (!p.difficultyRating) return false;
        return p.difficultyRating >= (filters.difficulty_min as number) && p.difficultyRating <= (filters.difficulty_max as number);
      });
    }

    // 5. Sort By
    if (filters.sort_by) {
      filtered.sort((a, b) => {
        if (filters.sort_by === 'difficulty') {
          const diffOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
          const aDiff = diffOrder[a.difficultyLevel] || 0;
          const bDiff = diffOrder[b.difficultyLevel] || 0;
          if (aDiff !== bDiff) return aDiff - bDiff;
          if (a.difficultyRating && b.difficultyRating) return a.difficultyRating - b.difficultyRating;
        } else if (filters.sort_by === 'title') {
          return a.title.localeCompare(b.title);
        } else if (filters.sort_by === 'acceptance' && a.acceptanceRate && b.acceptanceRate) {
          return b.acceptanceRate - a.acceptanceRate; // High to low
        }
        return 0;
      });
    }

    // 6. Limit
    const limit = filters.limit || 20;
    const finalProblems = filtered.slice(0, limit);

    return NextResponse.json({
      problems: finalProblems,
      total: filtered.length
    });

  } catch (error: any) {
    console.error('Filter API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
