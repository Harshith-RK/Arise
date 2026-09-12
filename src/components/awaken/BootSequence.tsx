"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { motionReduced } from "@/lib/motion";

/**
 * AWAKENING BOOT (brief motion graphic A). First run only.
 * A single line ignites and splits, the System window opens between the
 * halves, its frame draws, and the System speaks. Tap to skip.
 */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  useGSAP(
    () => {
      registerGsap();
      if (motionReduced()) {
        const t = window.setTimeout(finish, 600);
        return () => window.clearTimeout(t);
      }
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ onComplete: finish });

      tl.fromTo(q("[data-seed]"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 0)
        .to(q("[data-line-top]"), { y: -70, duration: 0.5, ease: "power2.inOut" }, 0.6)
        .to(q("[data-line-bottom]"), { y: 70, duration: 0.5, ease: "power2.inOut" }, 0.6)
        .fromTo(q("[data-boot-panel]"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.7)
        .fromTo(q("[data-boot-frame]"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out" }, 0.8)
        .fromTo(q("[data-tick]"), { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.18, stagger: 0.04 }, 0.95)
        .set(q("[data-line-a]"), { opacity: 1 }, 1.1)
        .to(q("[data-line-a]"), { duration: 0.5, scrambleText: { text: "SYSTEM INITIALIZING", chars: "01_/\\", speed: 0.8 } }, 1.1)
        .set(q("[data-line-b]"), { opacity: 1 }, 1.9)
        .to(q("[data-line-b]"), { duration: 0.6, scrambleText: { text: "A PLAYER HAS BEEN SELECTED", chars: "01_/\\", speed: 0.8 } }, 1.9)
        .to({}, { duration: 0.5 });

      return () => {
        tl.kill();
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-0 px-6"
      onPointerDown={finish}
      role="status"
      aria-label="System initializing"
    >
      <span data-seed data-line-top className="absolute left-0 right-0 h-px origin-center bg-frost-2" aria-hidden />
      <span data-seed data-line-bottom className="absolute left-0 right-0 h-px origin-center bg-frost-2" aria-hidden />

      <div data-boot-panel className="relative w-full max-w-[420px] opacity-0">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 150" preserveAspectRatio="none" aria-hidden>
          <path
            data-boot-frame
            d="M 10 0.5 H 409.5 L 419.5 10 V 149.5 H 10.5 L 0.5 140 V 10 Z"
            fill="var(--ink-1)"
            stroke="var(--line-2)"
            strokeWidth={1}
          />
        </svg>
        <div className="relative flex h-[150px] flex-col justify-center gap-2 px-6">
          <p data-line-a className="t-readout text-ember opacity-0">
            &nbsp;
          </p>
          <p data-line-b className="t-readout text-frost-0 opacity-0">
            &nbsp;
          </p>
        </div>
        <span data-tick className="absolute -left-1.5 -top-1.5 h-3 w-3 border-l border-t border-frost-2 opacity-0" aria-hidden />
        <span data-tick className="absolute -bottom-1.5 -right-1.5 h-3 w-3 border-b border-r border-frost-2 opacity-0" aria-hidden />
      </div>

      <p className="t-micro absolute bottom-10 text-frost-2">TAP TO SKIP</p>
    </div>
  );
}
