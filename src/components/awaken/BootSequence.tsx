"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap } from "@/lib/gsap";
import { motionReduced } from "@/lib/motion";

/**
 * AWAKENING BOOT (brief motion graphic A). Plays once, after the Hunter has
 * been registered: a single line ignites and splits, the System window opens
 * between the halves, its frame draws, and the System names who it selected.
 * Tap to skip.
 */
export function BootSequence({
  name,
  lines,
  onDone,
}: {
  name?: string;
  /** Replaces the awakening lines, e.g. for a returning Hunter. Up to three. */
  lines?: string[];
  onDone: () => void;
}) {
  // It can only say who was chosen because it now runs after they said so.
  const selected = name ? `${name.toUpperCase()} HAS BEEN SELECTED` : "A PLAYER HAS BEEN SELECTED";
  const shown = (lines?.length ? lines : ["SYSTEM INITIALIZING", selected]).slice(0, 3);
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
      const q = gsap.utils.selector(root);
      if (motionReduced()) {
        // No scramble and no split, but the words still have to be read.
        q("[data-boot-panel]").forEach((el) => ((el as HTMLElement).style.opacity = "1"));
        q("[data-line]").forEach((el, i) => {
          (el as HTMLElement).textContent = shown[i] ?? "";
          (el as HTMLElement).style.opacity = "1";
        });
        const t = window.setTimeout(finish, 900 + shown.length * 500);
        return () => window.clearTimeout(t);
      }
      const tl = gsap.timeline({ onComplete: finish });

      tl.fromTo(q("[data-seed]"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 0)
        .to(q("[data-line-top]"), { y: -70, duration: 0.5, ease: "power2.inOut" }, 0.6)
        .to(q("[data-line-bottom]"), { y: 70, duration: 0.5, ease: "power2.inOut" }, 0.6)
        .fromTo(q("[data-boot-panel]"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.7)
        .fromTo(q("[data-boot-frame]"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.3, ease: "power2.out" }, 0.8)
        .fromTo(q("[data-tick]"), { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.18, stagger: 0.04 }, 0.95);
      q("[data-line]").forEach((el, i) => {
        const at = 1.1 + i * 0.75;
        tl.set(el, { opacity: 1 }, at).to(el, { duration: 0.55, scrambleText: { text: shown[i] ?? "", chars: "01_/\\", speed: 0.8 } }, at);
      });
      tl.to({}, { duration: 0.6 });

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
      aria-label={`${shown.join(". ")}.`}
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
            // The panel grows with a long name; keep the frame line one pixel.
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="relative flex min-h-[150px] flex-col justify-center gap-2 px-6 py-5">
          {shown.map((_, i) => (
            <p key={i} data-line className={`t-readout opacity-0 ${i === 0 ? "text-ember" : i === 1 ? "text-frost-0" : "text-frost-1"}`}>
              &nbsp;
            </p>
          ))}
        </div>
        <span data-tick className="absolute -left-1.5 -top-1.5 h-3 w-3 border-l border-t border-frost-2 opacity-0" aria-hidden />
        <span data-tick className="absolute -bottom-1.5 -right-1.5 h-3 w-3 border-b border-r border-frost-2 opacity-0" aria-hidden />
      </div>

      <p className="t-micro absolute bottom-10 text-frost-2">TAP TO SKIP</p>
    </div>
  );
}
