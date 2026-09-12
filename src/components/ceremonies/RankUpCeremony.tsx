"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, SplitText } from "@/lib/gsap";
import { RankPlaque } from "@/components/system/RankPlaque";
import { Button } from "@/components/system/primitives";
import { motionReduced } from "@/lib/motion";
import { RANK_TITLES } from "@/lib/engine/xp";
import type { Rank } from "@/lib/engine/types";

const SPARKS = 40;

/**
 * RANK UP: "Forging" (brief motion graphic F).
 * Blackout, the old plaque fractures and falls, square sparks rise, the new
 * plaque draws and heats through discrete steps, then the title lands.
 * Meanwhile the app's temperature is already tweening behind the overlay
 * (the rank attribute changed on <html>, and the ember tokens are
 * registered @property colors that transition over 1.2s).
 * Tap anywhere to jump to the end state.
 */
export function RankUpCeremony({ from, to, onDone }: { from: Rank; to: Rank; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  /** First tap jumps to the settled state; a second tap dismisses. */
  const skipOrFinish = () => {
    const tl = tlRef.current;
    if (tl && tl.progress() < 0.98) {
      tl.progress(1);
      return;
    }
    finish();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Enter") skipOrFinish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useGSAP(
    () => {
      registerGsap();
      const q = gsap.utils.selector(root);
      const cta = root.current?.querySelector<HTMLButtonElement>("[data-cta]");
      const title = root.current?.querySelector<HTMLElement>("[data-title]");

      if (motionReduced()) {
        gsap.set([q("[data-old]")], { opacity: 0 });
        gsap.set([q("[data-new]"), q("[data-title]"), q("[data-cta]")], { opacity: 1 });
        gsap.set(q("[data-new] path"), { drawSVG: "0% 100%" });
        cta?.focus();
        const t = window.setTimeout(finish, 3600);
        return () => window.clearTimeout(t);
      }

      const split = title ? new SplitText(title, { type: "chars" }) : null;
      const tl = gsap.timeline({ onComplete: () => cta?.focus() });
      tlRef.current = tl;

      // 1. Blackout, old plaque cold on screen.
      tl.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none" }, 0)
        .fromTo(q("[data-old]"), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }, 0.2)
        // 2. It fractures and falls away.
        .to(q("[data-old-shard]"), {
          duration: 0.55,
          ease: "power2.in",
          opacity: 0,
          y: (i: number) => 60 + i * 12,
          rotation: (i: number) => (i % 2 ? 14 : -14),
          stagger: 0.02,
        }, 1.0)
        .to(q("[data-old]"), { opacity: 0, duration: 0.3 }, 1.0)
        // 3. Sparks rise.
        .fromTo(
          q("[data-spark]"),
          { opacity: 0, y: 0 },
          {
            opacity: 1,
            y: () => -120 - Math.random() * 260,
            x: () => (Math.random() - 0.5) * 90,
            duration: () => 1.6 + Math.random() * 1.4,
            ease: "power1.out",
            stagger: { each: 0.02, from: "random" },
          },
          1.1,
        )
        .to(q("[data-spark]"), { opacity: 0, duration: 0.6, stagger: { each: 0.02, from: "random" } }, 2.1)
        // 4. The new plaque draws, then heats through discrete steps.
        .set(q("[data-new]"), { opacity: 1 }, 1.7)
        .fromTo(q("[data-new] [data-part='frame']"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.7, ease: "power2.inOut" }, 1.7)
        .fromTo(q("[data-new] [data-part='letter']"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.5, ease: "power2.out" }, 2.2)
        .fromTo(
          q("[data-new] [data-part='fill']"),
          { fill: "var(--ink-1)" },
          { fill: "var(--ember-3)", duration: 0.4, ease: "steps(3)" },
          2.4,
        )
        .fromTo(q("[data-new] [data-part='trim']"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.4, ease: "power2.out" }, 2.7);

      // 5. Title and CTA.
      if (split) {
        tl.set(title as HTMLElement, { opacity: 1 }, 3.0).from(
          split.chars,
          { yPercent: 60, opacity: 0, duration: 0.4, stagger: 0.02, ease: "power3.out" },
          3.0,
        );
      }
      tl.fromTo(q("[data-cta]"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 3.5);

      return () => split?.revert();
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-ink-0 px-6 opacity-0"
      onPointerDown={skipOrFinish}
      role="dialog"
      aria-modal="true"
      aria-label={`Rank up. You have reached rank ${to}, ${RANK_TITLES[to]}.`}
    >
      {/* Sparks: small squares, never circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: SPARKS }, (_, i) => (
          <span
            key={i}
            data-spark
            className="absolute bg-ember opacity-0"
            style={{
              left: `${8 + ((i * 37) % 84)}%`,
              bottom: `${6 + ((i * 13) % 22)}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
            }}
          />
        ))}
      </div>

      <div className="relative flex h-[180px] w-[180px] items-center justify-center">
        <div data-old className="absolute inset-0 flex items-center justify-center opacity-0">
          <div className="relative">
            <RankPlaque rank={from} tone="cold" size={150} />
            <div className="absolute inset-0" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  data-old-shard
                  className="absolute inset-0 bg-ink-0"
                  style={{ clipPath: `polygon(50% 50%, ${20 + i * 14}% 0%, ${34 + i * 14}% 0%)`, opacity: 0 }}
                />
              ))}
            </div>
          </div>
        </div>
        <div data-new className="absolute inset-0 flex items-center justify-center opacity-0">
          <RankPlaque rank={to} tone={to === "S" ? "white" : "brass"} size={150} />
        </div>
      </div>

      <div className="text-center">
        <h2 data-title className="t-display-1 text-frost-0 opacity-0">
          RANK {to}. {RANK_TITLES[to].toUpperCase()}.
        </h2>
        <p className="t-micro mt-3 text-frost-2">THE SYSTEM ACKNOWLEDGES YOUR GROWTH</p>
      </div>

      <Button data-cta variant="primary" size="lg" className="opacity-0" onClick={finish}>
        Continue
      </Button>
    </div>
  );
}
