import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HAS_BACKEND, isProtectedPath, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Refreshes the auth cookie on every navigation, and keeps signed-out visitors
 * out of the app: /app and /awaken send them to sign in, and a signed-in
 * Hunter who opens the sign in page goes straight to their quest.
 *
 * A session that ends while a page is already open is caught in the client
 * too (GameProvider), since no navigation passes through here for that.
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

  const {
    data: { user },
  } = await db.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const redirect = (to: URL) => {
    const out = NextResponse.redirect(to);
    // Carry any refreshed session cookie onto the redirect.
    for (const cookie of response.cookies.getAll()) out.cookies.set(cookie);
    return out;
  };

  if (!user && isProtectedPath(pathname)) {
    const to = new URL("/auth", request.url);
    to.searchParams.set("next", `${pathname}${search}`);
    return redirect(to);
  }
  if (user && pathname === "/auth") {
    const next = request.nextUrl.searchParams.get("next");
    return redirect(new URL(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/quest", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, the service worker and icons.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon-|.*\\.(?:png|svg|jpg|jpeg|webp|woff2?)$).*)",
  ],
};
