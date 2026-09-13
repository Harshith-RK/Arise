"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: SupabaseClient | null = null;

/**
 * One browser client for the tab. Created lazily so a build without Supabase
 * configured never constructs it, and so the auth listener is installed once.
 */
export function supabase(): SupabaseClient | null {
  if (!HAS_BACKEND) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
