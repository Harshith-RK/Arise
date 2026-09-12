import * as React from "react";
import type { ReactNode } from "react";

/**
 * React's <ViewTransition> exists in the canary channel that the Next.js App
 * Router runs on, but is not in the published @types/react yet. This shim
 * types it without pulling in `any` at every call site.
 */
type TransitionClass = string | Record<string, string>;

type ViewTransitionProps = {
  children: ReactNode;
  name?: string;
  default?: TransitionClass;
  enter?: TransitionClass;
  exit?: TransitionClass;
  update?: TransitionClass;
  share?: TransitionClass;
};

const Impl = (React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionProps> }).ViewTransition;

export const ViewTransition: React.ComponentType<ViewTransitionProps> = Impl ?? (({ children }) => children as never);
