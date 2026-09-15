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
  | { status: "signed-in"; userId: string; email: string | null; name: string | null };

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
          ? {
              status: "signed-in",
              userId: session.user.id,
              email: session.user.email ?? null,
              // Google puts the account's name here. Email sign-ups have none.
              name: nameFrom(session.user.user_metadata),
            }
          : { status: "signed-out" },
      );

    void db.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

function nameFrom(meta: Record<string, unknown> | undefined): string | null {
  const raw = meta?.full_name ?? meta?.name;
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 40) : null;
}

/** Where a part-finished onboarding is kept, per account so two never mix. */
export const draftKey = (userId: string | null) => `wa:awaken-draft:${userId ?? "local"}`;

/** Forget every part-finished onboarding on this device, including the old unscoped one. */
export function clearDrafts(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === "wa:awaken-draft" || key.startsWith("wa:awaken-draft:")) localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable */
  }
}

export async function signOut(): Promise<void> {
  // Half-filled answers belong to whoever typed them, not the next person here.
  clearDrafts();
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
