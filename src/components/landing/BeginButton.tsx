"use client";

import { useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/system/primitives";
import { hasHunterMarker } from "@/lib/prefs";
import { HAS_BACKEND } from "@/lib/supabase/env";
import { useAuth } from "@/lib/supabase/session";

/**
 * The way in from the landing page. With accounts on, a signed-out visitor
 * signs in first, and a signed-in one goes to today's quest (which sends them
 * through onboarding if they have not set up yet). Without accounts, it reads
 * a marker rather than opening the database, so the landing page never creates
 * app storage.
 */
export function BeginButton({ variant = "primary", size = "lg" }: { variant?: "primary" | "ghost"; size?: "sm" | "md" | "lg" }) {
  const auth = useAuth();
  const existingLocal = useSyncExternalStore(
    subscribeToStorage,
    hasHunterMarker,
    () => false, // the server cannot know; assume a new Hunter
  );

  if (HAS_BACKEND) {
    const signedIn = auth.status === "signed-in";
    return (
      <ButtonLink href={signedIn ? "/app/quest" : "/auth"} variant={variant} size={size}>
        {signedIn ? "Open today's quest" : "Sign in to begin"}
      </ButtonLink>
    );
  }

  return (
    <ButtonLink href={existingLocal ? "/app/quest" : "/awaken"} variant={variant} size={size}>
      {existingLocal ? "Open today's quest" : "Begin awakening"}
    </ButtonLink>
  );
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
