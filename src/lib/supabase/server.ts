import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Server client bound to the request's cookies. Used by the OAuth callback and
 * anywhere a route needs to know who is asking.
 */
export async function supabaseServer() {
  if (!HAS_BACKEND) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session instead, so this is safe to skip.
        }
      },
    },
  });
}
