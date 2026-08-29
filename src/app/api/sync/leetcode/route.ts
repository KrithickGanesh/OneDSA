import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "LeetCode sync endpoint is working."
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "LeetCode sync endpoint is working."
  });
}
