"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Required around anything using the `m.*` components.
 *
 * Without it they render at their `initial` state and never animate in, which
 * for SystemWindow means opacity 0: the page is present, focusable and
 * screen-readable, and completely invisible. Any route outside /app that uses
 * system components needs this wrapper.
 */
export function MotionScope({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
