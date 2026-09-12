"use client";

import { m } from "motion/react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { IconCardio, IconDumbbell, IconMeal, IconStreak } from "@/components/icons";
import { motionReduced } from "@/lib/motion";
import type { Streak, StreakCategory } from "@/lib/engine/derive";

const ICON: Record<StreakCategory, typeof IconStreak> = {
  workout: IconDumbbell,
  diet: IconMeal,
  cardio: IconCardio,
};

const LABEL: Record<StreakCategory, string> = { workout: "Workout", diet: "Diet", cardio: "Cardio" };

const STATE_COPY = {
  burning: { label: "BURNING", color: "var(--ember)" },
  banked: { label: "BANKED", color: "var(--glacier)" },
  broken: { label: "BROKEN", color: "var(--fault)" },
  unlit: { label: "UNLIT", color: "var(--frost-2)" },
} as const;

/**
 * Streak counter with its three live states (brief motion graphic G):
 * burning flickers, banked glazes over with frost on a rest day, broken
 * drops and frosts over. State never depends on colour alone: the label and
 * the glyph change too.
 */
export function StreakCard({ streak, onOpen }: { streak: Streak; onOpen?: () => void }) {
  const Icon = ICON[streak.category];
  const copy = STATE_COPY[streak.state];
  const root = useRef<HTMLDivElement>(null);
  const broke = streak.state === "broken";

  useGSAP(
    () => {
      if (!broke || motionReduced()) return;
      registerGsap();
      const q = gsap.utils.selector(root);
      gsap
        .timeline()
        .fromTo(q("[data-count]"), { y: 0, filter: "blur(0px)" }, { y: 12, filter: "blur(6px)", duration: 0.36, ease: "power2.in" })
        .set(q("[data-count]"), { y: 0, filter: "blur(0px)" })
        .fromTo(q("[data-frost]"), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power1.inOut" }, 0);
    },
    { scope: root, dependencies: [broke] },
  );

  const body = (
    <div ref={root} className="relative overflow-hidden px-4 py-4">
      {streak.state === "banked" || streak.state === "broken" ? <FrostGlaze /> : null}
      <div className="relative flex items-center gap-3">
        <Icon size={18} className="shrink-0" style={{ color: copy.color }} />
        <span className="t-readout flex-1 text-frost-1">{LABEL[streak.category]}</span>
        <span className="t-micro" style={{ color: copy.color }}>
          {copy.label}
        </span>
      </div>
      <div className="relative mt-2 flex items-end gap-2">
        <m.span
          data-count
          className="t-num"
          style={{ fontSize: 44, color: copy.color }}
          initial={false}
          animate={
            streak.state === "burning" && !motionReduced()
              ? { opacity: [1, 1, 0.62, 0.92, 0.7, 1] }
              : { opacity: 1 }
          }
          transition={
            streak.state === "burning"
              ? { duration: 2.4, times: [0, 0.62, 0.66, 0.7, 0.74, 0.8], repeat: Infinity, repeatDelay: 0.6 }
              : { duration: 0.2 }
          }
        >
          {streak.count}
        </m.span>
        <span className="t-micro pb-1.5 text-frost-2">DAYS</span>
        {streak.best > streak.count ? (
          <span className="t-micro ml-auto pb-1.5 text-frost-2">BEST {streak.best}</span>
        ) : null}
      </div>
    </div>
  );

  if (!onOpen) return <div className="surface-panel">{body}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pressable surface-panel w-full text-left transition-none hov:bg-ink-2"
      aria-label={`${LABEL[streak.category]} streak: ${streak.count} days, ${copy.label.toLowerCase()}. Open calendar.`}
    >
      {body}
    </button>
  );
}

/** Frost creeping over a banked or broken counter. */
function FrostGlaze() {
  return (
    <svg data-frost className="pointer-events-none absolute inset-0 h-full w-full opacity-60" aria-hidden>
      <defs>
        <filter id="wa-frost">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5 0 0 0 0 0.65 0 0 0 0 0.71 0 0 0 -1.4 0.72" />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#wa-frost)" />
    </svg>
  );
}
