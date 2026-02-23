import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { appendFileSync } from "fs";

const LOG_PATH = "/Users/mohit/Documents/soraipixel apps/sorapixel/.cursor/debug.log";
function dbgLog(msg: string, data: Record<string, unknown>, hid: string) {
  try { appendFileSync(LOG_PATH, JSON.stringify({location:'auth/callback/route.ts',message:msg,data,timestamp:Date.now(),hypothesisId:hid})+'\n'); } catch {}
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";

  // #region agent log
  dbgLog('Callback hit', {hasCode:!!code, next, fullUrl: request.url}, 'H3');
  // #endregion

  if (code) {
    const finalRedirect = next || "/auth/redirect";
    const redirectUrl = `${origin}${finalRedirect}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // #region agent log
    dbgLog('Code exchange result', {hasError:!!error, errorMsg: error?.message, redirectUrl}, 'H3');
    // #endregion
    if (!error) {
      return response;
    }
  }

  // #region agent log
  dbgLog('Callback failed - redirecting to login', {hasCode:!!code}, 'H3');
  // #endregion
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
