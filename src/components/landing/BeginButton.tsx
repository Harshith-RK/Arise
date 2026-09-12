"use client";

import { useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/system/primitives";
import { hasHunterMarker } from "@/lib/prefs";

/**
 * Routes to onboarding, or straight to today's quest if this device already
 * has a Hunter. Reads a marker rather than opening the database, so the
 * landing page never creates app storage.
 */
export function BeginButton({ variant = "primary", size = "lg" }: { variant?: "primary" | "ghost"; size?: "sm" | "md" | "lg" }) {
  const existing = useSyncExternalStore(
    subscribeToStorage,
    hasHunterMarker,
    () => false, // the server cannot know; assume a new Hunter
  );

  return (
    <ButtonLink href={existing ? "/app/quest" : "/awaken"} variant={variant} size={size}>
      {existing ? "Open today's quest" : "Begin awakening"}
    </ButtonLink>
  );
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
