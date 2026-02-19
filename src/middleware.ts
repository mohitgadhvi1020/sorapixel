import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "sb-session";

const PROTECTED_ROUTES = ["/jewelry", "/studio", "/admin"];

const SECTION_ROUTE_MAP: Record<string, string> = {
  "/jewelry": "jewelry",
  "/studio": "studio",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (!isProtected) return NextResponse.next();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = JSON.parse(sessionCookie);

    // Admin route check
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (!session.isAdmin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Admins bypass section checks
    if (session.isAdmin) return NextResponse.next();

    // Section access check
    const allowedSections: string[] = session.allowedSections || ["studio", "jewelry"];
    for (const [route, section] of Object.entries(SECTION_ROUTE_MAP)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        if (!allowedSections.includes(section)) {
          const noAccessUrl = new URL("/no-access", req.url);
          noAccessUrl.searchParams.set("section", section);
          return NextResponse.redirect(noAccessUrl);
        }
      }
    }
  } catch {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/jewelry/:path*", "/studio/:path*", "/admin/:path*"],
};
