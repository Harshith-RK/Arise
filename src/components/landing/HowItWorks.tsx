"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { motionReduced } from "@/lib/motion";

const STEPS = [
  { title: "The System sets the quest", body: "Each day auto-generates from your own split and your own meals. Nothing to plan at 7 PM." },
  { title: "You clear it", body: "One tap per exercise or meal. Swipe on a phone. The weight you used is remembered for next time." },
  { title: "Heat transfers to CORE", body: "Every cleared quest sends XP to the core meter. Records are checked against your estimated one-rep max, not raw weight." },
  { title: "The Hunter levels", body: "Levels raise your rank. Rank warms the whole interface, from frozen ash at E to white heat at S." },
];

/**
 * One pinned instrument, redrawn across four scrubbed steps. Single column,
 * no cards. On reduced motion it becomes a plain list with no pinning.
 */
export function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (motionReduced()) return;
      registerGsap();
      const q = gsap.utils.selector(root);
      const steps = q("[data-step]");
      const cells = q("[data-cell]");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=2400",
          pin: true,
          scrub: 0.6,
        },
      });

      steps.forEach((step, i) => {
        tl.to(step, { opacity: 1, y: 0, duration: 0.4 }, i * 1.2);
        // The meter fills a quarter per step.
        tl.to(
          cells.slice(0, Math.round(((i + 1) / STEPS.length) * cells.length)),
          { backgroundColor: "var(--ember)", duration: 0.4, stagger: 0.02 },
          i * 1.2,
        );
        // 0.7 is the floor that still passes AA in both skins.
        if (i < steps.length - 1) tl.to(step, { opacity: 0.7, duration: 0.3 }, i * 1.2 + 0.9);
      });

      return () => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto flex min-h-[100dvh] max-w-[760px] flex-col justify-center px-4 py-20">
      <h2 className="t-display-1 text-frost-0">How the System works</h2>

      <div className="mt-10 flex gap-[3px]" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} data-cell className="h-3 flex-1 bg-ink-3" />
        ))}
      </div>

      <ol className="mt-10 space-y-7">
        {STEPS.map((s, i) => (
          <li key={s.title} data-step className="opacity-100 md:opacity-70" style={{ transform: "translateY(6px)" }}>
            <h3 className="t-title text-frost-0">{s.title}</h3>
            <p className="t-body mt-2 max-w-[62ch] text-frost-0">{s.body}</p>
            <span className="sr-only">Step {i + 1} of {STEPS.length}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
