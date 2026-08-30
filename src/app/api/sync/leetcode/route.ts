import { NextResponse } from "next/server";
import { fetchLeetCodeSolved, fetchLeetCodeQuestionDetails } from "@/lib/sync/leetcode";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto";

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

    let username: string | undefined;
    let sessionCookie: string | undefined;

    try {
      const body = await req.json();
      username = body?.username;
      sessionCookie = body?.sessionCookie || body?.leetcodeSession;
    } catch {
      // Body might be empty, will fallback to database handle
    }

    // 2. If username is not passed in body, lookup user's saved handle
    if (!username) {
      const { data: handleRow } = await supabase
        .from('user_platform_handles')
        .select('handle')
        .eq('user_id', user.id)
        .eq('platform', 'leetcode')
        .maybeSingle();

      username = handleRow?.handle;
    }

    // Lookup encrypted LEETCODE_SESSION if saved in user_api_keys
    if (!sessionCookie) {
      try {
        const { data: sessionKeyRow } = await supabase
          .from('user_api_keys')
          .select('encrypted_key, iv, auth_tag')
          .eq('user_id', user.id)
          .eq('provider', 'leetcode_session')
          .maybeSingle();

        if (sessionKeyRow?.encrypted_key && sessionKeyRow?.iv && sessionKeyRow?.auth_tag) {
          sessionCookie = await decryptApiKey(sessionKeyRow.encrypted_key, sessionKeyRow.iv, sessionKeyRow.auth_tag);
        }
      } catch (err) {
        console.warn('Failed to decrypt leetcode_session:', err);
      }
    }

    if (!username) {
      return NextResponse.json(
        { success: false, message: "No LeetCode username provided or configured in settings" },
        { status: 400 }
      );
    }

    // 3. Fetch LeetCode submissions & stats (supporting full lifetime sync if session cookie exists)
    const leetCodeData = await fetchLeetCodeSolved(username, sessionCookie);

    const acList: Array<{ title: string; titleSlug: string; timestamp?: string }> = 
      leetCodeData?.data?.recentAcSubmissionList || [];
    
    const recentList: Array<{ title: string; titleSlug: string; statusDisplay?: string }> = 
      leetCodeData?.data?.recentSubmissionList || [];

    // Filter accepted submissions from recent list
    const acceptedFromRecent = recentList.filter(s => s.statusDisplay === "Accepted");

    // Merge and deduplicate by titleSlug
    const uniqueSolvedMap = new Map<string, { title: string; titleSlug: string; timestamp?: string }>();

    for (const item of acList) {
      if (item?.titleSlug && !uniqueSolvedMap.has(item.titleSlug)) {
        uniqueSolvedMap.set(item.titleSlug, item);
      }
    }

    for (const item of acceptedFromRecent) {
      if (item?.titleSlug && !uniqueSolvedMap.has(item.titleSlug)) {
        uniqueSolvedMap.set(item.titleSlug, item);
      }
    }

    const solvedProblems = Array.from(uniqueSolvedMap.values());

    if (solvedProblems.length === 0) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: `No solved problems found for LeetCode user ${username}.`,
        data: leetCodeData,
      });
    }

    // 4. Fetch details (difficulty & tags) and upsert into database in concurrent batches
    const BATCH_SIZE = 5;
    const syncedProblems: any[] = [];

    for (let i = 0; i < solvedProblems.length; i += BATCH_SIZE) {
      const batch = solvedProblems.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Fetch question metadata
            const details = await fetchLeetCodeQuestionDetails(item.titleSlug);

            const difficulty = details?.difficulty || "Medium";
            const tags = details?.topicTags?.map((t: any) => (t.slug || t.name || "").toLowerCase().trim()).filter(Boolean) || [];
            const title = details?.title || item.title;

            // Upsert into problems table
            const { data: problem, error: problemError } = await supabase
              .from("problems")
              .upsert(
                {
                  platform: "leetcode",
                  platform_problem_id: item.titleSlug,
                  title,
                  slug: item.titleSlug,
                  difficulty,
                  tags,
                  url: `https://leetcode.com/problems/${item.titleSlug}/`,
                },
                { onConflict: "platform,platform_problem_id" }
              )
              .select("id")
              .single();

            if (problemError) {
              console.error(`Error saving problem ${item.titleSlug}:`, problemError);
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
                    solved_at: item.timestamp 
                      ? new Date(Number(item.timestamp) * 1000).toISOString() 
                      : new Date().toISOString(),
                  },
                  { onConflict: "user_id,problem_id" }
                );

              if (statusError) {
                console.error(`Error updating status for problem ${item.titleSlug}:`, statusError);
              } else {
                syncedProblems.push({
                  id: problem.id,
                  slug: item.titleSlug,
                  title,
                  difficulty,
                  tags,
                });
              }
            }
          } catch (err) {
            console.error(`Failed to process problem ${item.titleSlug}:`, err);
          }
        })
      );
    }

    // Record sync history
    try {
      await supabase.from("sync_history").insert({
        user_id: user.id,
        platform: "leetcode",
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
      message: `Successfully synced ${syncedProblems.length} LeetCode problems for ${username}.`,
      problems: syncedProblems,
      stats: leetCodeData?.data?.matchedUser?.submitStats || null,
    });

  } catch (error: any) {
    console.error("LeetCode bulk sync error:", error);
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("sync_history").insert({
          user_id: user.id,
          platform: "leetcode",
          synced_count: 0,
          status: "failed",
          error_message: error?.message || "Sync failed",
          synced_at: new Date().toISOString(),
        });
      }
    } catch {}

    return NextResponse.json(
      { success: false, message: error?.message || "Failed to sync LeetCode data" },
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
    message: "LeetCode sync endpoint is ready. Send a POST request to sync all solved problems.",
    user: { id: user.id, email: user.email }
  });
}
