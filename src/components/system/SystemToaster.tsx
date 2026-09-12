"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

const QUERY = "(min-width: 768px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * One Toaster only. Two mounts would duplicate every notice in the
 * accessibility tree, so the position follows a media query instead.
 * Notices sit below the fixed app bar so they never cover CORE.
 */
export function SystemToaster() {
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );

  return (
    <Toaster
      position={isDesktop ? "top-right" : "top-center"}
      visibleToasts={3}
      gap={8}
      offset={{ top: 72, right: 20 }}
      mobileOffset={{ top: 68, left: 12, right: 12 }}
      toastOptions={{ unstyled: true }}
    />
  );
}
