import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Fetch all configured handles for this user
    const { data: handlesData, error: handlesError } = await supabase
      .from('user_platform_handles')
      .select('platform, handle')
      .eq('user_id', user.id);

    if (handlesError) {
      throw handlesError;
    }

    const connectedHandles = (handlesData || []).filter((h: any) => h.handle && h.handle.trim());

    if (connectedHandles.length === 0) {
      return NextResponse.json(
        { success: false, message: "No platform handles configured. Please connect your accounts in Settings." },
        { status: 400 }
      );
    }

    // 3. Trigger sync across all connected platforms in parallel
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const cookie = req.headers.get("cookie") || "";

    const syncPromises = connectedHandles.map(async ({ platform, handle }: { platform: string; handle: string }) => {
      try {
        const endpoint = `${protocol}://${host}/api/sync/${platform}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({ handle }),
        });

        const json = await res.json().catch(() => ({}));
        return {
          platform,
          success: json.success || false,
          syncedCount: json.syncedCount || 0,
          message: json.message || (json.success ? "Sync successful" : "Sync failed"),
        };
      } catch (err: any) {
        return {
          platform,
          success: false,
          syncedCount: 0,
          message: err.message || "Failed to call sync endpoint",
        };
      }
    });

    const results = await Promise.all(syncPromises);

    const platformResults: Record<string, any> = {};
    let totalSynced = 0;

    for (const r of results) {
      platformResults[r.platform] = {
        success: r.success,
        syncedCount: r.syncedCount,
        message: r.message,
      };
      if (r.success) {
        totalSynced += r.syncedCount;
      }
    }

    return NextResponse.json({
      success: true,
      totalSynced,
      connectedCount: connectedHandles.length,
      message: `Universal sync completed. Synced ${totalSynced} problems across ${connectedHandles.length} platforms.`,
      platforms: platformResults,
    });

  } catch (error: any) {
    console.error("Universal sync error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to execute universal sync" },
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
    message: "Universal sync endpoint is ready. Send a POST request to sync all configured platforms.",
  });
}
