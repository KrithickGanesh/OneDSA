import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user collections with problem count
    const { data: collections, error } = await supabase
      .from("collections")
      .select("id, name, description, color, created_at, updated_at, collection_problems ( count )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (collections || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color || "#06b6d4",
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      problemCount: c.collection_problems?.[0]?.count || 0,
    }));

    return NextResponse.json({
      success: true,
      collections: formatted,
    });
  } catch (error: any) {
    console.error("Collections fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load collections" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    const { data: newCollection, error } = await supabase
      .from("collections")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#06b6d4",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      collection: newCollection,
    });
  } catch (error: any) {
    console.error("Collection create error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create collection" },
      { status: 500 }
    );
  }
}
