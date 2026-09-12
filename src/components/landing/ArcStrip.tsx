"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { motionReduced } from "@/lib/motion";
import { RANK_FLOOR_LEVEL, RANK_TITLES, xpForLevel } from "@/lib/engine/xp";
import type { Rank } from "@/lib/engine/types";

const DAYS = 90;
/** Roughly 220 XP a day at full completion; used to place the rank marks. */
const XP_PER_DAY = 220;

function dayForRank(rank: Rank): number {
  return Math.round(xpForLevel(RANK_FLOOR_LEVEL[rank]) / XP_PER_DAY);
}

/** Ninety days of heat, filling as you scroll, with the ranks marked. */
export function ArcStrip() {
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

  const marks = (["D", "C", "B"] as Rank[]).map((r) => ({ rank: r, day: dayForRank(r) })).filter((m) => m.day <= DAYS);

  return (
    <section ref={root} className="mx-auto max-w-[900px] px-4 py-24">
      <h2 className="t-display-1 text-frost-0">The arc</h2>
      <p className="t-body mt-3 max-w-[58ch] text-frost-1">
        Ninety days, one square each. Clear every mandatory quest and the day lights. At roughly {XP_PER_DAY} XP a day,
        here is where the ranks land.
      </p>

      <div className="mt-10 flex flex-wrap gap-[3px]" aria-hidden>
        {Array.from({ length: DAYS }, (_, i) => (
          <span key={i} data-day className="h-5 w-[calc(100%/30-3px)] bg-ink-3 sm:h-6" />
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
          <dt className="t-micro text-frost-2">DAY {DAYS}</dt>
          <dd className="t-readout mt-1 text-brass">ARC COMPLETE</dd>
        </div>
      </dl>
    </section>
  );
}
