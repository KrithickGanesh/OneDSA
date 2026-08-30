import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 1. Fetch all revision scheduled problems for this user
    const { data: scheduleItems, error: schedError } = await supabase
      .from("revision_schedule")
      .select("id, problem_id, next_review_at, interval_days, ease_factor, repetitions, last_reviewed_at, created_at, problems ( id, platform, title, slug, difficulty, tags, url )")
      .eq("user_id", user.id)
      .order("next_review_at", { ascending: true });

    if (schedError) throw schedError;

    const allItems = (scheduleItems || []).map((item: any) => ({
      id: item.id,
      problemId: item.problem_id,
      problem: item.problems,
      nextReviewAt: item.next_review_at,
      intervalDays: item.interval_days,
      easeFactor: item.ease_factor,
      repetitions: item.repetitions,
      lastReviewedAt: item.last_reviewed_at,
      createdAt: item.created_at,
      isDue: new Date(item.next_review_at).getTime() <= Date.now(),
    }));

    const dueToday = allItems.filter((i) => i.isDue);
    const upcoming = allItems.filter((i) => !i.isDue);

    return NextResponse.json({
      success: true,
      dueToday,
      upcoming,
      totalScheduled: allItems.length,
      dueCount: dueToday.length,
    });
  } catch (error: any) {
    console.error("Revision fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { problemId, quality = 3 } = body; // quality rating 1 (Hard), 3 (Good), 5 (Easy)

    if (!problemId) {
      return NextResponse.json({ success: false, error: "problemId is required" }, { status: 400 });
    }

    // 1. Fetch current revision record if it exists
    const { data: existing } = await supabase
      .from("revision_schedule")
      .select("*")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .maybeSingle();

    let repetitions = existing?.repetitions || 0;
    let intervalDays = existing?.interval_days || 1;
    let easeFactor = existing?.ease_factor || 2.5;

    const q = Math.max(1, Math.min(5, Number(quality) || 3));

    // 2. SM-2 Spaced Repetition Algorithm
    if (q < 3) {
      // Review failed / hard - restart
      repetitions = 0;
      intervalDays = 1;
    } else {
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitions += 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error: upsertError } = await supabase
      .from("revision_schedule")
      .upsert(
        {
          user_id: user.id,
          problem_id: problemId,
          next_review_at: nextReviewAt,
          interval_days: intervalDays,
          ease_factor: easeFactor,
          repetitions,
          last_reviewed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,problem_id" }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({
      success: true,
      message: `Problem scheduled for revision in ${intervalDays} day${intervalDays === 1 ? '' : 's'}.`,
      item: updated,
    });
  } catch (error: any) {
    console.error("Revision schedule update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
