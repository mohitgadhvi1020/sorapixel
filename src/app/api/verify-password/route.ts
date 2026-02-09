import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const accessPassword = process.env.ACCESS_PASSWORD;

    if (!accessPassword) {
      // If no password is set, allow access (open mode)
      return NextResponse.json({ success: true });
    }

    if (password === accessPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
