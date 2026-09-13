/**
 * Supabase connection details. Public by design: the anon key is safe in the
 * browser because every table is behind row level security, so it grants
 * nothing without a session.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Whether a backend is configured at all. Without it the app runs exactly as
 * it did before: local-first, on this device, no account. That fallback is not
 * a degraded mode, it is the original product, so it must keep working.
 */
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
