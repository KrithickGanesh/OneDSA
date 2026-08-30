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

    // Fetch friendships where current user is user_id or friend_id
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status, created_at")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) throw error;

    const acceptedFriends = [];
    const pendingIncoming = [];
    const pendingOutgoing = [];

    for (const f of friendships || []) {
      const isSender = f.user_id === user.id;
      const otherUserId = isSender ? f.friend_id : f.user_id;

      // Lookup profile info for the other user from auth.users / user_platform_handles
      const { data: otherHandles } = await supabase
        .from("user_platform_handles")
        .select("platform, handle")
        .eq("user_id", otherUserId);

      const friendItem = {
        friendshipId: f.id,
        userId: otherUserId,
        status: f.status,
        createdAt: f.created_at,
        handles: otherHandles || [],
      };

      if (f.status === "accepted") {
        acceptedFriends.push(friendItem);
      } else if (f.status === "pending") {
        if (isSender) {
          pendingOutgoing.push(friendItem);
        } else {
          pendingIncoming.push(friendItem);
        }
      }
    }

    return NextResponse.json({
      success: true,
      friends: acceptedFriends,
      pendingIncoming,
      pendingOutgoing,
    });
  } catch (error: any) {
    console.error("Friends fetch error:", error);
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
    const { friendId, action = "request", friendshipId } = body;

    // Action: Accept pending request
    if (action === "accept" && friendshipId) {
      const { data: updated, error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId)
        .eq("friend_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Friend request accepted!", friendship: updated });
    }

    // Action: Send request
    if (!friendId) {
      return NextResponse.json({ success: false, error: "friendId is required" }, { status: 400 });
    }

    if (friendId === user.id) {
      return NextResponse.json({ success: false, error: "Cannot add yourself as a friend" }, { status: 400 });
    }

    const { data: newFriendship, error: insertError } = await supabase
      .from("friendships")
      .upsert(
        {
          user_id: user.id,
          friend_id: friendId,
          status: "accepted", // instant connect in MVP
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,friend_id" }
      )
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: "Friend connected successfully!",
      friendship: newFriendship,
    });
  } catch (error: any) {
    console.error("Friend action error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const friendshipId = searchParams.get("friendshipId");

    if (!friendshipId) {
      return NextResponse.json({ success: false, error: "friendshipId query param required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Friend removed" });
  } catch (error: any) {
    console.error("Friend remove error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
