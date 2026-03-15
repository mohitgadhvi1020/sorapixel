import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/studio", "/catalogue", "/batch-listing", "/projects", "/profile", "/admin", "/brand-settings", "/blog-images"];

const EUROPE_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","GB",
  "NO","CH","IS",
]);

function detectCurrency(countryCode: string): string {
  if (countryCode === "IN") return "INR";
  if (EUROPE_CODES.has(countryCode)) return "EUR";
  return "USD";
}

function setGeoCookie(response: NextResponse, req: NextRequest): NextResponse {
  if (req.cookies.get("geo_country")) return response;

  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "";

  if (country) {
    const currency = detectCurrency(country);
    response.cookies.set("geo_country", country, { path: "/", maxAge: 86400 * 7 });
    response.cookies.set("geo_currency", currency, { path: "/", maxAge: 86400 * 7 });
  }

  return response;
}

function setAnonIdCookie(response: NextResponse, req: NextRequest): NextResponse {
  if (req.cookies.get("anon_id")) return response;
  const id = crypto.randomUUID();
  response.cookies.set("anon_id", id, { path: "/", maxAge: 86400 * 365, httpOnly: false });
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (!isProtected) {
    let response = NextResponse.next();
    response = setGeoCookie(response, req);
    response = setAnonIdCookie(response, req);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  supabaseResponse = setGeoCookie(supabaseResponse, req);
  supabaseResponse = setAnonIdCookie(supabaseResponse, req);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|api/).*)",
  ],
};
