"use client";

import { useEffect, useRef } from "react";
import { m } from "motion/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { SPRING, motionReduced, vibrate } from "@/lib/motion";
import { IconSeal } from "@/components/icons";

/**
 * DAY CLEARED SEAL (brief motion graphic H). A brass stamp lands, the page
 * takes a 2px knock, and the notice follows. Non-blocking: it never eats a
 * tap, and it clears itself.
 */
export function DayClearedSeal({ arcDay, dayXp, onDone }: { arcDay: number; dayXp: number; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    vibrate([12, 40, 18]);
    if (!motionReduced()) {
      registerGsap();
      // Knock the content, not the shell: shaking a fixed-position ancestor
      // would drag the nav with it.
      const main = document.getElementById("wa-main");
      if (main) gsap.fromTo(main, { x: -2 }, { x: 0, duration: 0.12, ease: "power2.out", clearProps: "x" });
    }
    const t = setTimeout(onDone, motionReduced() ? 900 : 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center" aria-hidden>
      <m.div
        className="flex items-center gap-3 border-2 border-brass bg-ink-0 px-5 py-4"
        initial={{ scale: 1.4, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: -4 }}
        exit={{ opacity: 0 }}
        transition={SPRING.seal}
      >
        <IconSeal size={22} className="text-brass" />
        <div>
          <p className="t-readout text-brass">ARC DAY {arcDay} CLEARED</p>
          <p className="t-micro mt-0.5 text-frost-2">+{dayXp} XP</p>
        </div>
      </m.div>
    </div>
  );
}
