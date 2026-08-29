import { NextResponse } from "next/server";
import { fetchLeetCodeSolved } from "@/lib/sync/leetcode";

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username is required" },
        { status: 400 }
      );
    }

    const data = await fetchLeetCodeSolved(username);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch LeetCode data" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (username) {
    try {
      const data = await fetchLeetCodeSolved(username);
      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error?.message || "Failed to fetch LeetCode data" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: "LeetCode sync endpoint is working. Send a POST with { \"username\": \"your_username\" } or GET with ?username=your_username",
  });
}
