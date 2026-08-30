import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify collection belongs to user
    const { data: collection, error: colError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (colError || !collection) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { problemId, notes } = body;

    if (!problemId) {
      return NextResponse.json({ success: false, error: "problemId is required" }, { status: 400 });
    }

    const { data: added, error: insertError } = await supabase
      .from("collection_problems")
      .upsert(
        {
          collection_id: collectionId,
          problem_id: problemId,
          notes: notes || null,
          added_at: new Date().toISOString(),
        },
        { onConflict: "collection_id,problem_id" }
      )
      .select()
      .single();

    if (insertError) throw insertError;

    // Update collection updated_at
    await supabase
      .from("collections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", collectionId);

    return NextResponse.json({ success: true, item: added });
  } catch (error: any) {
    console.error("Add problem to collection error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify collection belongs to user
    const { data: collection, error: colError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (colError || !collection) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const problemId = searchParams.get("problemId");

    if (!problemId) {
      return NextResponse.json({ success: false, error: "problemId query param is required" }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from("collection_problems")
      .delete()
      .eq("collection_id", collectionId)
      .eq("problem_id", problemId);

    if (delError) throw delError;

    return NextResponse.json({ success: true, message: "Problem removed from collection" });
  } catch (error: any) {
    console.error("Remove problem from collection error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
