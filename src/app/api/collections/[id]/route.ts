import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch collection details
    const { data: collection, error: colError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (colError || !collection) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    // 2. Fetch problems inside collection
    const { data: colProblems, error: probError } = await supabase
      .from("collection_problems")
      .select("problem_id, added_at, notes, problems ( id, platform, title, slug, difficulty, tags, url )")
      .eq("collection_id", id)
      .order("added_at", { ascending: false });

    if (probError) throw probError;

    const problems = (colProblems || []).map((cp: any) => ({
      ...cp.problems,
      addedAt: cp.added_at,
      notes: cp.notes,
    }));

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        problems,
        problemCount: problems.length,
      },
    });
  } catch (error: any) {
    console.error("Collection detail fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, color } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name && typeof name === "string") updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description;
    if (color && typeof color === "string") updatePayload.color = color;

    const { data: updated, error } = await supabase
      .from("collections")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, collection: updated });
  } catch (error: any) {
    console.error("Collection update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Collection deleted" });
  } catch (error: any) {
    console.error("Collection delete error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
