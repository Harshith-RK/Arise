import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Refreshes the auth cookie on navigation so a session does not expire out from
 * under a Hunter mid-arc. It only refreshes: gating happens in the client,
 * because /app has to stay reachable offline where no cookie check can run.
 *
 * This is the `proxy` convention, not `middleware`: the latter is deprecated in
 * this version of Next.
 */
export async function proxy(request: NextRequest) {
  if (!HAS_BACKEND) return NextResponse.next();

  let response = NextResponse.next({ request });
  const db = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  await db.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, the service worker and icons.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon-|.*\\.(?:png|svg|jpg|jpeg|webp|woff2?)$).*)",
  ],
};
