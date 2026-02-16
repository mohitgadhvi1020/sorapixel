import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "sb-session";

const PROTECTED_ROUTES = ["/jewelry", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect specific routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (!isProtected) return NextResponse.next();

  // If Supabase is not configured, let the legacy PasswordGate handle it
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For /admin routes, check if user is admin
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    try {
      const session = JSON.parse(sessionCookie);
      if (!session.isAdmin) {
        return NextResponse.redirect(new URL("/jewelry", req.url));
      }
    } catch {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/jewelry/:path*", "/admin/:path*"],
};
