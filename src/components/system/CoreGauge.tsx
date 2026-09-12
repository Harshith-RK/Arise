"use client";

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { Odometer } from "./primitives";
import { SPRING } from "@/lib/motion";

export const CORE_TARGET_ID = "wa-core-gauge";

/**
 * CORE: the XP meter. 24 discrete cells; a newly filled cell steps through
 * ember-3 > ember-2 > ember, and the leading cell flashes white heat before
 * settling. Lives in the app bar on every /app route and never remounts, so
 * heat transfers always have a target.
 */
export function CoreGauge({
  into,
  span,
  level,
  compact = false,
}: {
  into: number;
  span: number;
  level: number;
  compact?: boolean;
}) {
  const cells = 24;
  const ratio = span === 0 ? 0 : Math.max(0, Math.min(1, into / span));
  const filled = Math.round(ratio * cells);
  const prevFilled = useRef(filled);
  const [justLit, setJustLit] = useState<number | null>(null);

  useEffect(() => {
    if (filled > prevFilled.current) {
      setJustLit(filled - 1);
      const t = setTimeout(() => setJustLit(null), 140);
      prevFilled.current = filled;
      return () => clearTimeout(t);
    }
    prevFilled.current = filled;
  }, [filled]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3" id={CORE_TARGET_ID}>
      <span className="t-micro shrink-0 text-frost-2">
        LVL <span className="text-frost-0">{level}</span>
      </span>
      <div
        className="flex h-2.5 min-w-0 flex-1 gap-[2px]"
        role="meter"
        aria-label="Experience toward next level"
        aria-valuenow={into}
        aria-valuemin={0}
        aria-valuemax={span}
        aria-valuetext={`${into} of ${span} XP toward level ${level + 1}`}
      >
        {/* CSS transitions so the ember/core tokens interpolate correctly. */}
        {Array.from({ length: cells }, (_, i) => {
          const isFilled = i < filled;
          const hot = justLit === i;
          return (
            <span
              key={i}
              className="flex-1"
              style={{
                backgroundColor: hot ? "var(--core)" : isFilled ? "var(--ember)" : "var(--ink-3)",
                transition: `background-color ${hot ? 50 : 150}ms linear`,
              }}
            />
          );
        })}
      </div>
      {compact ? null : (
        <m.span className="t-micro shrink-0 text-frost-1" layout={false} transition={SPRING.snap}>
          <Odometer value={into} />
          <span className="text-frost-2"> / {span} XP</span>
        </m.span>
      )}
    </div>
  );
}
