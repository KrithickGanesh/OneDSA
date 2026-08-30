import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  streak: number;
  platforms: Record<string, number>;
  isCurrentUser: boolean;
  rank: number;
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "global"; // "friends" | "global"

    // 1. Determine user IDs to include
    let userIdsToFetch = [user.id];

    if (scope === "friends") {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = (friendships || []).map((f: any) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      userIdsToFetch = Array.from(new Set([user.id, ...friendIds]));
    } else {
      // Global scope: fetch all users who have solved problems in user_problem_status
      const { data: allActiveUsers } = await supabase
        .from("user_problem_status")
        .select("user_id")
        .eq("status", "solved")
        .limit(200);

      const activeIds = (allActiveUsers || []).map((r: any) => r.user_id);
      userIdsToFetch = Array.from(new Set([user.id, ...activeIds]));
    }

    // 2. Fetch solved problems and handles for these users
    const entries: LeaderboardEntry[] = [];

    for (const uId of userIdsToFetch) {
      // Solved problems with difficulties
      const { data: solvedRows } = await supabase
        .from("user_problem_status")
        .select("problem_id, solved_at, problems ( platform, difficulty )")
        .eq("user_id", uId)
        .eq("status", "solved");

      // Platform handles
      const { data: handles } = await supabase
        .from("user_platform_handles")
        .select("platform, handle")
        .eq("user_id", uId);

      const isCurrent = uId === user.id;

      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;
      const platformCounts: Record<string, number> = {};
      const datesSet = new Set<string>();

      for (const row of (solvedRows || [])) {
        const p = row.problems as any;
        if (!p) continue;

        const diff = (p.difficulty || "").toLowerCase();
        if (diff === "easy") easySolved++;
        else if (diff === "medium") mediumSolved++;
        else if (diff === "hard") hardSolved++;

        const plat = (p.platform || "").toLowerCase();
        platformCounts[plat] = (platformCounts[plat] || 0) + 1;

        if (row.solved_at) {
          datesSet.add(row.solved_at.split("T")[0]);
        }
      }

      // Compute streak
      let streak = 0;
      const now = new Date();
      let iter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = iter.toISOString().split("T")[0];
      const yest = new Date(iter);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];

      let startDate = datesSet.has(todayStr) ? iter : datesSet.has(yestStr) ? yest : null;
      if (startDate) {
        let cur = new Date(startDate);
        while (true) {
          const dStr = cur.toISOString().split("T")[0];
          if (datesSet.has(dStr)) {
            streak++;
            cur.setDate(cur.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Display name
      const primaryHandle = handles?.[0]?.handle || (isCurrent ? (user.user_metadata?.username || user.email?.split("@")[0]) : `Coder_${uId.slice(0, 4)}`);

      entries.push({
        userId: uId,
        name: primaryHandle,
        avatarUrl: isCurrent ? (user.user_metadata?.avatar_url || null) : null,
        totalSolved: (solvedRows || []).length,
        easySolved,
        mediumSolved,
        hardSolved,
        streak,
        platforms: platformCounts,
        isCurrentUser: isCurrent,
        rank: 0,
      });
    }

    // 3. Sort by total solved descending and assign ranks
    entries.sort((a, b) => b.totalSolved - a.totalSolved || b.streak - a.streak);
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return NextResponse.json({
      success: true,
      leaderboard: entries,
      currentUserRank: entries.find((e) => e.isCurrentUser)?.rank || 1,
      totalParticipants: entries.length,
    });
  } catch (error: any) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
