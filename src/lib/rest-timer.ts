"use client";

import { useSyncExternalStore } from "react";

/* ==========================================================================
   The rest between sets.

   Kept outside the page that starts it. A rest runs for ninety seconds of real
   time, not for as long as the Challenger happens to stay on the quest screen,
   so walking over to Progress or Log while the clock runs has to leave it
   running.

   It is stored as the moment it ends rather than as a number counted down once
   a second: a phone screen that sleeps, or a browser that throttles a
   background tab, stops the ticks but not the clock on the wall.
   ========================================================================== */

export type Rest = {
  /** When the rest is up, as epoch ms. Null when nothing is resting. */
  endsAt: number | null;
  /** Seconds the rest started with, for the progress bar. */
  total: number;
  /** Seconds left at the moment it was paused, or null while it runs. */
  pausedWith: number | null;
};

const IDLE: Rest = { endsAt: null, total: 0, pausedWith: null };

let state: Rest = IDLE;
const listeners = new Set<() => void>();

function set(next: Rest) {
  state = next;
  for (const l of listeners) l();
}

export function startRest(seconds: number) {
  if (seconds <= 0) return;
  set({ endsAt: Date.now() + seconds * 1000, total: seconds, pausedWith: null });
}

export function pauseRest() {
  if (state.endsAt === null || state.pausedWith !== null) return;
  set({ ...state, pausedWith: Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)) });
}

export function resumeRest() {
  if (state.pausedWith === null) return;
  set({ ...state, endsAt: Date.now() + state.pausedWith * 1000, pausedWith: null });
}

export function extendRest(seconds: number) {
  if (state.endsAt === null) return;
  if (state.pausedWith !== null) set({ ...state, total: state.total + seconds, pausedWith: state.pausedWith + seconds });
  else set({ ...state, total: state.total + seconds, endsAt: state.endsAt + seconds * 1000 });
}

export function dismissRest() {
  set(IDLE);
}

/** The rest as it stands, for code that is not a React component. */
export function restNow(): Rest {
  return state;
}

/** Seconds left, floored at zero. */
export function secondsLeft(rest: Rest, now = Date.now()): number {
  if (rest.pausedWith !== null) return rest.pausedWith;
  if (rest.endsAt === null) return 0;
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useRest(): Rest {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
