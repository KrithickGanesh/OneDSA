import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCodeforcesUserSolved } from "@/lib/sync/codeforces";
import { normalizeDifficulty } from "@/lib/sync/normalize";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Get current authenticated user
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
      // Body might be empty, will fallback to database handle
    }

    // 2. If handle is not passed in body, lookup user's saved handle
    if (!handle) {
      const { data: handleRow } = await supabase
        .from('user_platform_handles')
        .select('handle')
        .eq('user_id', user.id)
        .eq('platform', 'codeforces')
        .maybeSingle();

      handle = handleRow?.handle;
    }

    if (!handle) {
      return NextResponse.json(
        { success: false, message: "No Codeforces handle provided or configured in settings" },
        { status: 400 }
      );
    }

    // 3. Fetch all accepted Codeforces submissions
    const solvedProblems = await fetchCodeforcesUserSolved(handle);

    if (solvedProblems.length === 0) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: `No solved problems found for Codeforces handle "${handle}".`,
      });
    }

    // 4. Upsert each solved problem into the database in batches
    const BATCH_SIZE = 10;
    const syncedProblems: any[] = [];

    for (let i = 0; i < solvedProblems.length; i += BATCH_SIZE) {
      const batch = solvedProblems.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            const problemId = item.platformProblemId;
            // Extract contestId and index from the combined problemId (e.g., "1920A")
            const match = problemId.match(/^(\d+)([A-Z]\d*)$/);
            if (!match) return;

            const contestId = match[1];
            const index = match[2];

            // Determine difficulty from the problem ID pattern
            const { level } = normalizeDifficulty('codeforces', 'Medium');

            const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
            const title = problemId; // Will be overwritten if problem already exists with real title

            // Upsert into problems table
            const { data: problem, error: problemError } = await supabase
              .from("problems")
              .upsert(
                {
                  platform: "codeforces",
                  platform_problem_id: problemId,
                  title,
                  slug: problemId,
                  difficulty: level,
                  tags: [],
                  url,
                },
                { onConflict: "platform,platform_problem_id", ignoreDuplicates: false }
              )
              .select("id, title")
              .single();

            if (problemError) {
              console.error(`Error saving CF problem ${problemId}:`, problemError);
              return;
            }

            if (problem?.id) {
              // Upsert into user_problem_status table
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

              if (statusError) {
                console.error(`Error updating status for CF problem ${problemId}:`, statusError);
              } else {
                syncedProblems.push({
                  id: problem.id,
                  platformProblemId: problemId,
                  title: problem.title,
                  difficulty: level,
                });
              }
            }
          } catch (err) {
            console.error(`Failed to process CF problem ${item.platformProblemId}:`, err);
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedProblems.length,
      totalDetected: solvedProblems.length,
      message: `Successfully synced ${syncedProblems.length} Codeforces problems for "${handle}".`,
      problems: syncedProblems,
    });

  } catch (error: any) {
    console.error("Codeforces sync error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to sync Codeforces data" },
      { status: 500 }
    );
  }
}

export async function GET() {
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

  return NextResponse.json({
    success: true,
    message: "Codeforces sync endpoint is ready. Send a POST request to sync all solved problems.",
    user: { id: user.id, email: user.email }
  });
}
