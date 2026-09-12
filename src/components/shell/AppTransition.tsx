"use client";

// The App Router runs on React's canary channel, which ships ViewTransition.
// The installed react types don't declare it yet, hence the local shim.
import { ViewTransition } from "@/lib/view-transition";
import type { ReactNode } from "react";

/**
 * Wraps a page's content so forward/back navigation slides directionally.
 * The types are set by each nav Link's transitionTypes; unrelated
 * transitions get no animation at all.
 */
export function AppTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
