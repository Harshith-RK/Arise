"use client";

import { useEffect, useState } from "react";
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
