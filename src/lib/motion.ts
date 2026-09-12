import type { Transition } from "motion/react";

/**
 * Motion tokens (brief section 8). Frequent actions are fast; ceremonies are
 * rare, earned and skippable; exits are faster than entrances.
 */
export const EASE = {
  out: [0.23, 1, 0.32, 1] as const,
  in: [0.55, 0, 1, 0.45] as const,
  inOut: [0.77, 0, 0.175, 1] as const,
  drawer: [0.32, 0.72, 0, 1] as const,
};

export const DURATION = {
  press: 0.09,
  enter: 0.22,
  exit: 0.14,
  window: 0.42,
};

export const SPRING = {
  snap: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } satisfies Transition,
  settle: { type: "spring", visualDuration: 0.45, bounce: 0.12 } satisfies Transition,
  heavy: { type: "spring", stiffness: 220, damping: 26, mass: 1.3 } satisfies Transition,
  seal: { type: "spring", stiffness: 700, damping: 30 } satisfies Transition,
};

export const press = { scale: 0.97 };
export const pressSmall = { scale: 0.985 };

export const enterUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 0 },
  transition: { duration: DURATION.enter, ease: EASE.out },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.enter, ease: EASE.out },
};

/** Reads the live in-app motion preference; call inside effects/handlers only. */
export function motionReduced(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-motion") === "reduced";
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (motionReduced()) return;
  // Chrome blocks and logs vibration before the first interaction, and some
  // notices (a streak that broke overnight) arrive without one.
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation && !activation.hasBeenActive) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
