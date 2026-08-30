import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface DashboardStatsResponse {
  totalSolved: number;
  totalInDb: number;
  unsolvedInDb: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  topicsMastered: number;
  currentStreak: number;
  platforms: Record<string, number>;
  topics: Array<{ topic: string; count: number }>;
  recentActivity: Array<{
    id: string;
    title: string;
    platform: string;
    difficulty: string;
    tags: string[];
    url: string;
    solvedAt: string;
  }>;
  connectedHandles: Array<{
    platform: string;
    handle: string;
    lastSyncedAt: string;
  }>;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Query total problems indexed in OneDSA
    const { count: totalInDbCount } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });

    const totalInDb = totalInDbCount || 0;

    // 3. Query user solved problems joined with problems table
    const { data: solvedRows, error: solvedError } = await supabase
      .from('user_problem_status')
      .select('problem_id, status, solved_at, problems ( id, platform, title, difficulty, tags, url, is_paid )')
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .order('solved_at', { ascending: false });

    if (solvedError) {
      console.error('Error fetching solved problems for dashboard:', solvedError);
      throw solvedError;
    }

    // 4. Query user connected handles & latest sync history
    const { data: handlesData } = await supabase
      .from('user_platform_handles')
      .select('platform, handle, updated_at, created_at')
      .eq('user_id', user.id);

    let latestSyncMap: Record<string, any> = {};
    try {
      const { data: syncHistoryData } = await supabase
        .from('sync_history')
        .select('platform, synced_count, status, synced_at, error_message')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false });

      for (const row of (syncHistoryData || [])) {
        if (!latestSyncMap[row.platform]) {
          latestSyncMap[row.platform] = row;
        }
      }
    } catch (histErr) {
      console.warn('Could not load sync_history table:', histErr);
    }

    const connectedHandles = (handlesData || []).map((h: any) => {
      const syncRecord = latestSyncMap[h.platform];
      return {
        platform: h.platform,
        handle: h.handle,
        lastSyncedAt: syncRecord?.synced_at || h.updated_at || h.created_at || null,
        syncedCount: syncRecord?.synced_count ?? null,
        syncStatus: syncRecord?.status || (h.handle ? 'idle' : 'unconnected'),
      };
    });

    // 5. Compute Analytics
    const solvedList = (solvedRows || []).map((r: any) => ({
      ...r.problems,
      solvedAt: r.solved_at || new Date().toISOString(),
    })).filter((p: any) => p && p.title);

    const totalSolved = solvedList.length;
    const unsolvedInDb = Math.max(totalInDb - totalSolved, 0);

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    const platformCounts: Record<string, number> = {
      leetcode: 0,
      codeforces: 0,
      codechef: 0,
      hackerrank: 0,
      gfg: 0,
    };

    const topicCountsMap: Record<string, number> = {};
    const solvedDates = new Set<string>();

    for (const item of solvedList) {
      // Difficulty counts
      const diff = (item.difficulty || '').toLowerCase();
      if (diff === 'easy') easySolved++;
      else if (diff === 'medium') mediumSolved++;
      else if (diff === 'hard') hardSolved++;

      // Platform counts
      const plat = (item.platform || '').toLowerCase();
      if (platformCounts[plat] !== undefined) {
        platformCounts[plat]++;
      } else {
        platformCounts[plat] = 1;
      }

      // Topic tags aggregation
      const tags = Array.isArray(item.tags) ? item.tags : [];
      for (const t of tags) {
        const canonicalTag = t.trim().toLowerCase();
        if (canonicalTag) {
          // Format capitalized display tag (e.g. "tree" -> "Tree", "dynamic-programming" -> "Dynamic Programming")
          const displayTag = canonicalTag
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          topicCountsMap[displayTag] = (topicCountsMap[displayTag] || 0) + 1;
        }
      }

      // Track solved dates for streak computation (YYYY-MM-DD)
      if (item.solvedAt) {
        const dateStr = item.solvedAt.split('T')[0];
        solvedDates.add(dateStr);
      }
    }

    // Sort topics descending
    const topics = Object.entries(topicCountsMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    // Topics mastered (e.g. >= 3 problems solved in topic)
    const topicsMastered = topics.filter((t) => t.count >= 3).length;

    // 6. Compute Day Streak
    let currentStreak = 0;
    const now = new Date();
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if solved today; if not, check if solved yesterday
    const todayStr = checkDate.toISOString().split('T')[0];
    const yesterdayDate = new Date(checkDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    let startDate = solvedDates.has(todayStr) 
      ? checkDate 
      : solvedDates.has(yesterdayStr) 
        ? yesterdayDate 
        : null;

    if (startDate) {
      let iterDate = new Date(startDate);
      while (true) {
        const dStr = iterDate.toISOString().split('T')[0];
        if (solvedDates.has(dStr)) {
          currentStreak++;
          iterDate.setDate(iterDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 7. Recent Activity
    const recentActivity = solvedList.slice(0, 8).map((p: any) => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      difficulty: p.difficulty || 'Medium',
      tags: Array.isArray(p.tags) ? p.tags : [],
      url: p.url,
      solvedAt: p.solvedAt,
    }));

    const responseData: DashboardStatsResponse = {
      totalSolved,
      totalInDb,
      unsolvedInDb,
      easySolved,
      mediumSolved,
      hardSolved,
      topicsMastered,
      currentStreak,
      platforms: platformCounts,
      topics: topics.slice(0, 10), // Top 10 topics
      recentActivity,
      connectedHandles,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
