import { cookies } from "next/headers";
import { getSupabaseServer } from "./supabase";

const SESSION_COOKIE = "sb-session";

/**
 * Get the currently authenticated client from the session cookie.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getSessionClient(): Promise<{
  id: string;
  email: string;
  isAdmin: boolean;
} | null> {
  // If Supabase isn't configured, fall back to legacy password gate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) return null;

    const parsed = JSON.parse(sessionToken);
    const sb = getSupabaseServer();

    // Verify the user still exists and is active
    const { data: client } = await sb
      .from("clients")
      .select("id, email, is_admin, is_active")
      .eq("id", parsed.id)
      .single();

    if (!client || !client.is_active) return null;

    return {
      id: client.id,
      email: client.email,
      isAdmin: client.is_admin,
    };
  } catch {
    return null;
  }
}

/**
 * Check if Supabase auth is configured (env vars present).
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Check if an email is an admin email.
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
