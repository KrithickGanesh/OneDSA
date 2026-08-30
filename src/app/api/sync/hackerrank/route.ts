import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchHackerRankUserSolved } from "@/lib/sync/hackerrank";
import { normalizeDifficulty } from "@/lib/sync/normalize";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    let handle: string | undefined;

    try {
      const body = await req.json();
      handle = body?.handle || body?.username;
    } catch {
      // Body might be empty
    }

    if (!handle) {
      const { data: handleRow } = await supabase
        .from('user_platform_handles')
        .select('handle')
        .eq('user_id', user.id)
        .eq('platform', 'hackerrank')
        .maybeSingle();

      handle = handleRow?.handle;
    }

    if (!handle) {
      return NextResponse.json(
        { success: false, message: "No HackerRank handle provided or configured in settings" },
        { status: 400 }
      );
    }

    const solvedProblems = await fetchHackerRankUserSolved(handle);

    if (solvedProblems.length === 0) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: `No solved problems found for HackerRank handle "${handle}".`,
      });
    }

    const BATCH_SIZE = 10;
    const syncedProblems: any[] = [];

    for (let i = 0; i < solvedProblems.length; i += BATCH_SIZE) {
      const batch = solvedProblems.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            const { level } = normalizeDifficulty('hackerrank', 'Medium');

            const { data: problem, error: problemError } = await supabase
              .from("problems")
              .upsert(
                {
                  platform: "hackerrank",
                  platform_problem_id: item.platformProblemId,
                  title: item.platformProblemId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  slug: item.platformProblemId,
                  difficulty: level,
                  tags: [],
                  url: `https://www.hackerrank.com/challenges/${item.platformProblemId}/problem`,
                },
                { onConflict: "platform,platform_problem_id", ignoreDuplicates: false }
              )
              .select("id, title")
              .single();

            if (problemError) {
              console.error(`Error saving HR problem ${item.platformProblemId}:`, problemError);
              return;
            }

            if (problem?.id) {
              const { error: statusError } = await supabase
                .from("user_problem_status")
                .upsert(
                  {
                    user_id: user.id,
                    problem_id: problem.id,
                    status: "solved",
                    solved_at: item.solvedAt || new Date().toISOString(),
                  },
                  { onConflict: "user_id,problem_id" }
                );

              if (!statusError) {
                syncedProblems.push({
                  id: problem.id,
                  platformProblemId: item.platformProblemId,
                  title: problem.title,
                });
              }
            }
          } catch (err) {
            console.error(`Failed to process HR problem ${item.platformProblemId}:`, err);
          }
        })
      );
    }

    // Record sync history
    try {
      await supabase.from("sync_history").insert({
        user_id: user.id,
        platform: "hackerrank",
        synced_count: syncedProblems.length,
        status: "completed",
        synced_at: new Date().toISOString(),
      });
    } catch (histErr) {
      console.warn("Could not record sync_history:", histErr);
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedProblems.length,
      totalDetected: solvedProblems.length,
      message: `Successfully synced ${syncedProblems.length} HackerRank problems for "${handle}".`,
      problems: syncedProblems,
    });

  } catch (error: any) {
    console.error("HackerRank sync error:", error);
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("sync_history").insert({
          user_id: user.id,
          platform: "hackerrank",
          synced_count: 0,
          status: "failed",
          error_message: error?.message || "Sync failed",
          synced_at: new Date().toISOString(),
        });
      }
    } catch {}

    return NextResponse.json(
      { success: false, message: error?.message || "Failed to sync HackerRank data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "HackerRank sync endpoint is ready. Send a POST request to sync.",
  });
}
