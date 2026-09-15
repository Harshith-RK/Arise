/**
 * Supabase connection details. Public by design: the anon key is safe in the
 * browser because every table is behind row level security, so it grants
 * nothing without a session.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Whether accounts are on. With a backend configured, nothing past the landing
 * page opens without signing in, and every Hunter's data lives in the database.
 *
 * Without one the app runs local-only, on this device, no account. The
 * end-to-end suite runs that way on purpose (NEXT_PUBLIC_ARISE_LOCAL_ONLY=1),
 * so it never creates real accounts. The flag is inlined at build time, so a
 * deployed build cannot be switched into it from the browser.
 */
export const HAS_BACKEND =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && process.env.NEXT_PUBLIC_ARISE_LOCAL_ONLY !== "1";

/** Paths that need a signed-in Hunter when accounts are on. */
export const isProtectedPath = (pathname: string) =>
  pathname === "/awaken" || pathname.startsWith("/awaken/") || pathname === "/app" || pathname.startsWith("/app/");
