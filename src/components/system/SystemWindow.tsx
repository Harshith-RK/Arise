"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EASE, motionReduced } from "@/lib/motion";
import { chamferPath } from "./chamfer";

/**
 * The System window (T3 focal surface). Materialize sequence:
 * scale + opacity in, the 1px chamfered frame draws itself (DrawSVG), one
 * scanline sweeps, then children stagger. The frame is a measured SVG path
 * so the diagonals stay crisp at any size.
 *
 * One per screen. T1/T2 surfaces stay quiet (see Panel).
 */
export function SystemWindow({
  children,
  className,
  bodyClassName,
  chamfer = 10,
  frameColor = "var(--line-2)",
  animate = true,
  scan = true,
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  chamfer?: number;
  frameColor?: string;
  animate?: boolean;
  scan?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((b) => (Math.abs(b.w - width) < 0.5 && Math.abs(b.h - height) < 0.5 ? b : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // GSAP is loaded on demand: the frame draw is a flourish, not a
  // prerequisite for the panel being usable.
  useEffect(() => {
    if (!animate || !box.w || !pathRef.current || motionReduced()) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    void (async () => {
      const { gsap, registerGsap } = await import("@/lib/gsap");
      if (cancelled || !pathRef.current) return;
      registerGsap();
      ctx = gsap.context(() => {
        const tl = gsap.timeline();
        tl.fromTo(pathRef.current, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.38, ease: "power2.out" }, 0);
        if (scan && scanRef.current) {
          tl.fromTo(scanRef.current, { top: 0, opacity: 0.8 }, { top: box.h, opacity: 0, duration: 0.42, ease: "power1.out" }, 0.06);
        }
      }, ref);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [box.w, box.h, animate, scan]);

  return (
    <m.div
      ref={ref}
      className={`relative ${className ?? ""}`}
      style={{ ["--chamfer" as string]: `${chamfer}px` }}
      initial={animate ? { opacity: 0, scaleY: 0.94 } : false}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.24, ease: EASE.out }}
    >
      <div className="chamfer relative overflow-hidden bg-ink-1">
        {box.w > 0 ? (
          <svg
            className="pointer-events-none absolute inset-0"
            width={box.w}
            height={box.h}
            viewBox={`0 0 ${box.w} ${box.h}`}
            aria-hidden
          >
            <path ref={pathRef} d={chamferPath(box.w, box.h, chamfer)} fill="none" stroke={frameColor} strokeWidth={1} />
          </svg>
        ) : null}
        {scan ? (
          <div ref={scanRef} className="pointer-events-none absolute left-0 right-0 h-px bg-core opacity-0" aria-hidden />
        ) : null}
        <div className={`relative ${bodyClassName ?? ""}`}>{children}</div>
      </div>
      <CornerTicks />
    </m.div>
  );
}

/** Viewfinder marks that frame a focal window without adding weight. */
function CornerTicks() {
  return (
    <>
      <span className="pointer-events-none absolute -left-1.5 -top-1.5 h-3 w-3 border-l border-t border-frost-2" aria-hidden />
      <span className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-3 w-3 border-b border-r border-frost-2" aria-hidden />
    </>
  );
}

/** Stagger wrapper for a focal window's rows. */
export function SystemStagger({
  children,
  className,
  delayChildren = 0.05,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
}) {
  return (
    <m.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren } } }}
    >
      {children}
    </m.div>
  );
}

export function SystemStaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE.out } } }}
    >
      {children}
    </m.div>
  );
}
