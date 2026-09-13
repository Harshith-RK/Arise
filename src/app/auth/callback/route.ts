import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where Google sends the Hunter back. Exchanges the code for a session cookie
 * and forwards to wherever they were heading.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app/quest";
  const db = await supabaseServer();

  if (!code || !db) {
    return NextResponse.redirect(new URL("/auth?error=callback", url.origin));
  }

  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  // next is our own path, never an absolute URL, so this cannot be an open redirect.
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/app/quest", url.origin));
}
