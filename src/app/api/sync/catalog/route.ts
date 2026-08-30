import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLeetCodeProblems } from "@/lib/sync/leetcode";
import { fetchCodeforcesProblems } from "@/lib/sync/codeforces";
import { fetchHackerRankProblems } from "@/lib/sync/hackerrank";
import { fetchCodeChefProblems } from "@/lib/sync/codechef";
import { fetchGFGProblems } from "@/lib/sync/gfg";
import { Problem } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform"); // optional: 'leetcode' | 'codeforces' | 'hackerrank' | 'codechef' | 'gfg'

    const results: Record<string, number> = {};
    let totalInserted = 0;

    const fetchers: Array<{ name: string; fetcher: () => Promise<Problem[]> }> = [];
    if (!platform || platform === "leetcode") fetchers.push({ name: "leetcode", fetcher: () => fetchLeetCodeProblems(200) });
    if (!platform || platform === "codeforces") fetchers.push({ name: "codeforces", fetcher: async () => (await fetchCodeforcesProblems()).slice(0, 300) });
    if (!platform || platform === "hackerrank") fetchers.push({ name: "hackerrank", fetcher: fetchHackerRankProblems });
    if (!platform || platform === "codechef") fetchers.push({ name: "codechef", fetcher: fetchCodeChefProblems });
    if (!platform || platform === "gfg") fetchers.push({ name: "gfg", fetcher: fetchGFGProblems });

    for (const { name, fetcher } of fetchers) {
      try {
        const problems = await fetcher();
        const BATCH_SIZE = 50;
        let count = 0;

        for (let i = 0; i < problems.length; i += BATCH_SIZE) {
          const batch = problems.slice(i, i + BATCH_SIZE).map((p) => ({
            platform: p.platform,
            platform_problem_id: p.platformProblemId,
            title: p.title,
            slug: p.platformProblemId,
            difficulty: p.difficultyLevel || "Medium",
            tags: p.tags || [],
            url: p.url,
            is_paid: p.isPremium || false,
          }));

          const { error } = await supabase
            .from("problems")
            .upsert(batch, { onConflict: "platform,platform_problem_id", ignoreDuplicates: false });

          if (!error) {
            count += batch.length;
          } else {
            console.error(`Batch upsert error for ${name}:`, error);
          }
        }

        results[name] = count;
        totalInserted += count;
      } catch (platErr: any) {
        console.error(`Failed to seed ${name}:`, platErr);
        results[name] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      totalInserted,
      platforms: results,
      message: `Successfully populated problem catalog with ${totalInserted} problems across platforms.`,
    });
  } catch (error: any) {
    console.error("Catalog sync error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Catalog Sync endpoint ready. Send a POST request to ingest problems into Supabase.",
  });
}
