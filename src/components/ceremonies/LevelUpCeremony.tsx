"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, SplitText } from "@/lib/gsap";
import { Button } from "@/components/system/primitives";
import { motionReduced } from "@/lib/motion";

const SHARDS = 7;
const STAT_LABEL: Record<string, string> = {
  strength: "STRENGTH",
  stamina: "STAMINA",
  discipline: "DISCIPLINE",
  vitality: "VITALITY",
};

/** Wedge clip-path for shard i of n, radiating from the centre. */
function wedge(i: number, n: number): string {
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
  const r = 160;
  const p = (a: number) => `${50 + r * Math.cos(a)}% ${50 + r * Math.sin(a)}%`;
  return `polygon(50% 50%, ${p(a0)}, ${p((a0 + a1) / 2)}, ${p(a1)})`;
}

/**
 * LEVEL UP: "Thaw" (brief motion graphic E).
 * The screen freezes over, seven fractures draw out from the centre, the
 * frozen pane breaks into shards that drift apart, and the new level is
 * revealed beneath. Tap anywhere or press Escape to skip.
 */
export function LevelUpCeremony({
  from,
  to,
  statDeltas,
  onDone,
}: {
  from: number;
  to: number;
  statDeltas: { key: string; delta: number }[];
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useGSAP(
    () => {
      registerGsap();
      const reduced = motionReduced();
      const panel = root.current?.querySelector("[data-panel]");
      const dim = root.current?.querySelector("[data-dim]");
      const shards = root.current?.querySelectorAll("[data-shard]");
      const lines = root.current?.querySelectorAll("[data-fracture]");
      const num = root.current?.querySelector("[data-level-number]");
      const stats = root.current?.querySelectorAll("[data-stat]");
      const cta = root.current?.querySelector<HTMLButtonElement>("[data-cta]");

      if (reduced) {
        gsap.set(shards ?? [], { opacity: 0 });
        gsap.set(dim ?? [], { opacity: 0.88 });
        gsap.set(panel ?? [], { opacity: 1 });
        gsap.set(stats ?? [], { opacity: 1 });
        cta?.focus();
        const t = window.setTimeout(finish, 3200);
        return () => window.clearTimeout(t);
      }

      const split = num ? new SplitText(num as HTMLElement, { type: "chars" }) : null;
      const tl = gsap.timeline({ onComplete: () => cta?.focus() });

      tl.fromTo(shards ?? [], { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, 0)
        .fromTo(dim ?? [], { opacity: 0 }, { opacity: 0.88, duration: 0.3, ease: "none" }, 0.3)
        .fromTo(
          lines ?? [],
          { drawSVG: "0% 0%" },
          { drawSVG: "0% 100%", duration: 0.38, stagger: 0.03, ease: "power2.out" },
          0.12,
        )
        .to(
          shards ?? [],
          {
            duration: 0.5,
            ease: "power2.in",
            opacity: 0,
            x: (i: number) => Math.cos((i / SHARDS) * Math.PI * 2 - Math.PI / 2) * 90,
            y: (i: number) => Math.sin((i / SHARDS) * Math.PI * 2 - Math.PI / 2) * 90,
          },
          0.42,
        )
        .to(lines ?? [], { opacity: 0, duration: 0.3 }, 0.42)
        .fromTo(panel ?? [], { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.26, ease: "power3.out" }, 0.5);

      if (split) {
        tl.from(split.chars, { yPercent: 40, opacity: 0, stagger: 0.03, duration: 0.3, ease: "power3.out" }, 0.56).to(
          num as HTMLElement,
          { duration: 0.5, scrambleText: { text: String(to).padStart(2, "0"), chars: "0123456789", speed: 0.7 } },
          0.56,
        );
      }
      tl.fromTo(stats ?? [], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.24, stagger: 0.05, ease: "power3.out" }, 0.95);

      const auto = window.setTimeout(finish, 4600);
      return () => {
        window.clearTimeout(auto);
        split?.revert();
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      onPointerDown={finish}
      role="dialog"
      aria-modal="true"
      aria-label={`Level up. You have reached level ${to}.`}
    >
      {/* Dim layer: stays after the shards part so the panel is clearly modal. */}
      <div data-dim className="absolute inset-0 bg-ink-0 opacity-0" aria-hidden />

      <div
        data-panel
        className="chamfer relative z-0 w-full max-w-[420px] bg-ink-1 opacity-0"
        style={{ ["--chamfer" as string]: "12px" }}
      >
        <div className="border border-line-2 px-6 py-8 text-center">
          <p className="t-micro text-frost-2">LEVEL {String(from).padStart(2, "0")} CLEARED</p>
          <p data-level-number className="t-hero-num mt-3 text-ember">
            {String(to).padStart(2, "0")}
          </p>
          <p className="t-readout mt-3 text-frost-1">You have reached level {to}.</p>
          {statDeltas.length ? (
            <ul className="mt-6 space-y-1.5">
              {statDeltas.map((s) => (
                <li key={s.key} data-stat className="t-micro flex items-center justify-between text-frost-1 opacity-0">
                  <span>{STAT_LABEL[s.key] ?? s.key.toUpperCase()}</span>
                  <span className="text-ember">+{s.delta}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Button data-cta variant="primary" className="mt-7 w-full" onClick={finish}>
            Continue
          </Button>
        </div>
      </div>

      {/* Frozen pane that fractures and parts */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {Array.from({ length: SHARDS }, (_, i) => (
          <span
            key={i}
            data-shard
            className="absolute inset-0 bg-ink-0 opacity-0"
            style={{ clipPath: wedge(i, SHARDS) }}
          />
        ))}
      </div>
      <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden>
        {Array.from({ length: SHARDS }, (_, i) => {
          const a = (i / SHARDS) * Math.PI * 2 - Math.PI / 2;
          return (
            <line
              key={i}
              data-fracture
              x1="50%"
              y1="50%"
              x2={`${50 + 80 * Math.cos(a)}%`}
              y2={`${50 + 80 * Math.sin(a)}%`}
              stroke="var(--frost-2)"
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </div>
  );
}
