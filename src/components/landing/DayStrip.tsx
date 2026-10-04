"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { motionReduced } from "@/lib/motion";
import { RANK_FLOOR_LEVEL, RANK_TITLES, xpForLevel } from "@/lib/engine/xp";
import type { Rank } from "@/lib/engine/types";

/** Squares drawn. The run has no end, so the last of them fade out. */
const DAYS = 120;
const FADING = 18;
/** Roughly 220 XP a day at full completion; used to place the rank marks. */
const XP_PER_DAY = 220;

function dayForRank(rank: Rank): number {
  return Math.round(xpForLevel(RANK_FLOOR_LEVEL[rank]) / XP_PER_DAY);
}

/** Days of heat, filling as you scroll, with the ranks marked along the way. */
export function DayStrip() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (motionReduced()) return;
      registerGsap();
      const cells = gsap.utils.selector(root)("[data-day]");
      gsap.to(cells, {
        backgroundColor: "var(--ember)",
        stagger: 0.01,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 80%", end: "bottom 40%", scrub: 0.5 },
      });
      return () => ScrollTrigger.getAll().forEach((t) => t.kill());
    },
    { scope: root },
  );

  // Every rank worth naming, whether or not its day fits on the strip: the
  // point is that the ladder carries on past the squares.
  const marks = (["D", "C", "B"] as Rank[]).map((r) => ({ rank: r, day: dayForRank(r) }));

  return (
    <section ref={root} className="mx-auto max-w-[900px] px-4 py-24">
      <h2 className="t-display-1 text-frost-0">Day by day</h2>
      <p className="t-body mt-3 max-w-[58ch] text-frost-1">
        One square a day. Clear every mandatory quest and the day lights. At roughly {XP_PER_DAY} XP a day, here is
        where the ranks land. There is no last square: the run goes as far as you take it.
      </p>

      <div className="mt-10 flex flex-wrap gap-[3px]" aria-hidden>
        {Array.from({ length: DAYS }, (_, i) => (
          <span
            key={i}
            data-day
            className="h-5 w-[calc(100%/30-3px)] bg-ink-3 sm:h-6"
            // The tail thins out rather than stopping at a wall.
            style={i >= DAYS - FADING ? { opacity: 1 - (i - (DAYS - FADING) + 1) / (FADING + 2) } : undefined}
          />
        ))}
      </div>

      <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
        {marks.map((m) => (
          <div key={m.rank}>
            <dt className="t-micro text-frost-2">DAY {m.day}</dt>
            <dd className="t-readout mt-1 text-ember">
              RANK {m.rank} / {RANK_TITLES[m.rank].toUpperCase()}
            </dd>
          </div>
        ))}
        <div>
          <dt className="t-micro text-frost-2">AND ON</dt>
          <dd className="t-readout mt-1 text-brass">RANK A, THEN S</dd>
        </div>
      </dl>
    </section>
  );
}
