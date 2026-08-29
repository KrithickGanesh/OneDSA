import { NextResponse } from "next/server";
import { fetchLeetCodeSolved } from "@/lib/sync/leetcode";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Get current authenticated user
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

    try {
      const body = await req.json();
      username = body?.username;
    } catch {
      // Body might be empty, will fallback to database handle
    }

    // If username is not passed in the request body, look up user's saved handle
    if (!username) {
      const { data: handleRow } = await supabase
        .from('user_platform_handles')
        .select('handle')
        .eq('user_id', user.id)
        .eq('platform', 'leetcode')
        .maybeSingle();

      username = handleRow?.handle;
    }

    if (!username) {
      return NextResponse.json(
        { success: false, message: "No LeetCode username provided or configured in settings" },
        { status: 400 }
      );
    }

    // Fetch LeetCode data
    const data = await fetchLeetCodeSolved(username);

    // If recent submissions exist, insert/upsert them into Supabase problems table
    const submissions = data?.data?.recentSubmissionList || [];
    if (submissions.length > 0) {
      const problemsToInsert = submissions.map((item: any) => ({
        platform: 'leetcode',
        platform_problem_id: item.titleSlug,
        slug: item.titleSlug,
        title: item.title,
        url: `https://leetcode.com/problems/${item.titleSlug}/`,
      }));

      await supabase
        .from('problems')
        .upsert(problemsToInsert, { onConflict: 'platform,platform_problem_id' });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
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
    message: "LeetCode sync endpoint is ready. Send a POST request to sync.",
    user: { id: user.id, email: user.email }
  });
}
