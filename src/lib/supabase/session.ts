"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import { HAS_BACKEND } from "./env";

export type AuthState =
  | { status: "disabled" }                       // no backend configured: local-only, as before
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; userId: string; email: string | null };

/**
 * Who is signed in. Resolves once on mount and then follows auth events, so a
 * sign-in in another tab reaches this one too.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(HAS_BACKEND ? { status: "loading" } : { status: "disabled" });

  useEffect(() => {
    const db = supabase();
    if (!db) return;

    const apply = (session: Session | null) =>
      setState(
        session
          ? { status: "signed-in", userId: session.user.id, email: session.user.email ?? null }
          : { status: "signed-out" },
      );

    void db.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}

/**
 * Sign out and land on the sign in screen.
 *
 * Leaving /app happens first, on purpose. Signed out, the app falls back to
 * this device's local store, and on a device that only ever held the account
 * copy that store is empty, which the shell reads as a new Hunter and answers
 * with onboarding. Navigating away before the session ends unmounts the shell,
 * so there is nothing left to make that mistake.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  return useCallback(async () => {
    router.replace("/auth?signed-out=1");
    await signOut();
  }, [router]);
}
