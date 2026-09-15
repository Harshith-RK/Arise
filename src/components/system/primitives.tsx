"use client";

import { m } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { SPRING } from "@/lib/motion";

/* ==========================================================================
   Shared surfaces and controls. Depth comes from tone steps and hairlines:
   no shadows, no radii, no hover motion.
   ========================================================================== */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ember text-on-ember hov:bg-core hov:text-ink-0",
  secondary: "bg-ink-2 text-frost-0 border border-line-2 hov:bg-ink-3 hov:border-frost-2",
  ghost: "bg-transparent text-frost-1 border border-transparent hov:text-frost-0 hov:border-line-2",
  danger: "bg-transparent text-fault border border-fault hov:bg-fault hov:text-ink-0",
};

const SIZE: Record<ButtonSize, string> = {
  // 44px is the smallest target a thumb hits reliably. Desktop keeps the compact 36.
  sm: "h-11 px-3 t-micro lg:h-9",
  md: "h-12 px-4 t-readout",
  lg: "h-14 px-6 t-readout",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={`pressable inline-flex items-center justify-center gap-2 whitespace-nowrap transition-none disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      href={href}
      className={`pressable inline-flex items-center justify-center gap-2 whitespace-nowrap ${VARIANT[variant]} ${SIZE[size]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** T2 panel: the standard grouping container. */
export function Panel({
  children,
  className,
  title,
  meta,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`surface-panel ${className ?? ""}`}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
          <h2 className="t-readout text-frost-1">{title}</h2>
          {/* On a narrow phone this drops under the title rather than breaking
              "LOG WEIGH-IN" across two lines beside it. */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {meta ? <span className="t-micro whitespace-nowrap text-frost-2">{meta}</span> : null}
            {action}
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Small uppercase data readout. */
export function Readout({ children, className, tone }: { children: ReactNode; className?: string; tone?: string }) {
  return (
    <span className={`t-readout ${className ?? ""}`} style={tone ? { color: tone } : undefined}>
      {children}
    </span>
  );
}

/**
 * Segmented meter. Progress is discrete steps, never a blend.
 * Fills report as role="meter" for assistive tech.
 */
export function Meter({
  value,
  max = 1,
  cells = 12,
  label,
  valueText,
  color = "var(--ember)",
  trackColor = "var(--ink-3)",
  height = 10,
  className,
}: {
  value: number;
  max?: number;
  cells?: number;
  label: string;
  valueText?: string;
  color?: string;
  trackColor?: string;
  height?: number;
  className?: string;
}) {
  const ratio = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * cells);
  return (
    <div
      className={`flex w-full gap-[2px] ${className ?? ""}`}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuetext={valueText}
      style={{ height }}
    >
      {/* CSS transitions, not Motion: these colours are CSS variables, which
          Motion cannot interpolate, and the browser can. */}
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className="flex-1"
          style={{ backgroundColor: i < filled ? color : trackColor, transition: "background-color 150ms linear" }}
        />
      ))}
    </div>
  );
}

/**
 * Odometer digits. Each column translates independently so the number rolls
 * instead of swapping. Tabular figures keep the width stable.
 */
export function Odometer({ value, className }: { value: number; className?: string }) {
  const n = Math.max(0, Math.round(value));
  const chars = String(n).split("");
  return (
    <span className={`inline-flex ${className ?? ""}`}>
      <span className="sr-only">{n}</span>
      <span className="inline-flex" aria-hidden>
        {chars.map((c, i) => (
          <DigitColumn key={`${chars.length}-${i}`} digit={Number(c)} />
        ))}
      </span>
    </span>
  );
}

function DigitColumn({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block overflow-hidden" style={{ height: "1em", width: "0.62em" }} aria-hidden>
      <m.span
        className="absolute left-0 top-0 flex flex-col items-center"
        initial={false}
        animate={{ transform: `translateY(-${digit * 10}%)` }}
        transition={SPRING.snap}
        style={{ height: "1000%" }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="flex items-center justify-center" style={{ height: "10%" }}>
            {n}
          </span>
        ))}
      </m.span>
    </span>
  );
}

/** Structural loading placeholder that matches the final layout. */
export function Placeholder({ height = 120, className }: { height?: number; className?: string }) {
  return (
    <div
      className={`placeholder-block ${className ?? ""}`}
      style={{ height, ["--scan-h" as string]: `${height}px` }}
      aria-hidden
    />
  );
}

/** Empty state that teaches the interface rather than saying "nothing here". */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="t-readout text-frost-1">{title}</p>
      <p className="t-small mx-auto mt-2 max-w-[46ch] text-frost-2">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Page title block. No eyebrow labels. */
export function PageHeader({ title, meta, action }: { title: string; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h1 className="t-display-2 text-frost-0">{title}</h1>
      <div className="flex items-center gap-3">
        {meta}
        {action}
      </div>
    </div>
  );
}
