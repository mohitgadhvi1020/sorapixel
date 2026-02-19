import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/studio", "/jewelry", "/catalogue", "/projects", "/profile", "/admin"];
const PUBLIC_ROUTES = ["/", "/login", "/pricing"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) return NextResponse.next();

  /* 
   * JWT tokens are stored in localStorage (not cookies) for mobile-app compatibility.
   * Server middleware can't read localStorage, so we use a lightweight cookie flag
   * set by the client after login. The real auth check happens client-side via useAuth.
   * This middleware provides a fast redirect for obviously-unauthenticated users.
   */
  const hasSession = req.cookies.get("sp_logged_in")?.value;

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/jewelry/:path*",
    "/catalogue/:path*",
    "/projects/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
