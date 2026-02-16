import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";

const SESSION_COOKIE = "sb-session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Legacy fallback: if Supabase isn't configured, use ACCESS_PASSWORD
    if (!isSupabaseConfigured()) {
      const accessPassword = process.env.ACCESS_PASSWORD;
      if (!accessPassword || password === accessPassword) {
        return NextResponse.json({ success: true, legacy: true });
      }
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sb = getSupabaseServer();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await sb.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if client is active
    const { data: client } = await sb
      .from("clients")
      .select("id, email, is_admin, is_active, company_name, contact_name")
      .eq("id", authData.user.id)
      .single();

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Account not found. Contact admin." },
        { status: 403 }
      );
    }

    if (!client.is_active) {
      return NextResponse.json(
        { success: false, error: "Account deactivated. Contact admin." },
        { status: 403 }
      );
    }

    // Set session cookie
    const session = {
      id: client.id,
      email: client.email,
      isAdmin: client.is_admin,
      companyName: client.company_name,
      contactName: client.contact_name,
    };

    const response = NextResponse.json({ success: true, user: session });
    response.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
