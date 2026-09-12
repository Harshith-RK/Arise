"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE } from "@/lib/motion";

/**
 * Completion glyph: a square with one chamfered corner that fills from the
 * bottom up when the quest is cleared (brief motion graphic B). Never a
 * checkmark.
 */
export function CompletionSquare({ done, animate = true, size = 22 }: { done: boolean; animate?: boolean; size?: number }) {
  return (
    <span
      className="relative inline-block shrink-0 border"
      style={{ width: size, height: size, borderColor: done ? "var(--ember)" : "var(--line-2)", clipPath: "polygon(0 0, 72% 0, 100% 28%, 100% 100%, 0 100%)" }}
      aria-hidden
    >
      <m.span
        className="absolute inset-0 bg-ember"
        initial={false}
        animate={{ clipPath: done ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)" }}
        transition={animate ? { duration: 0.18, ease: EASE.out } : { duration: 0 }}
      />
    </span>
  );
}

/**
 * Quest label that dims and gets ruled through on completion. The rule is a
 * scaled pseudo-element, not text-decoration, so it can animate.
 */
export function StrikeLabel({
  children,
  done,
  animate = true,
  className,
}: {
  children: React.ReactNode;
  done: boolean;
  animate?: boolean;
  className?: string;
}) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <m.span
        className="block"
        initial={false}
        animate={{ color: done ? "var(--frost-2)" : "var(--frost-0)" }}
        transition={{ duration: animate ? 0.16 : 0 }}
      >
        {children}
      </m.span>
      <m.span
        className="absolute left-0 top-1/2 h-px w-full origin-left bg-frost-2"
        initial={false}
        animate={{ scaleX: done ? 1 : 0 }}
        transition={{ duration: animate ? 0.2 : 0, ease: EASE.out }}
        aria-hidden
      />
    </span>
  );
}

/**
 * Weight stepper. Sized and spaced for a thumb between sets: 44px targets,
 * 2.5 kg steps, press and hold to accelerate. Tapping the number opens the
 * keypad sheet instead of raising the OS keyboard.
 */
export function WeightStepper({
  value,
  onChange,
  onOpenKeypad,
  step = 2.5,
  suffix = "KG",
  min = 0,
  max = 500,
  label,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  onOpenKeypad?: () => void;
  step?: number;
  suffix?: string;
  min?: number;
  max?: number;
  label: string;
  /** Shown but inert, so a locked control still reads as the thing it will be. */
  disabled?: boolean;
}) {
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));

  const start = (dir: 1 | -1) => {
    onChange(clamp(value + dir * step));
    hold.current.timer = setTimeout(() => {
      let speed = 0;
      hold.current.interval = setInterval(() => {
        speed++;
        onChange(clamp(valueRef.current + dir * step * (speed > 8 ? 2 : 1)));
      }, 90);
    }, 420);
  };
  const stop = () => {
    clearTimeout(hold.current.timer);
    clearInterval(hold.current.interval);
  };

  // Keep the latest value available to the repeat interval.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => stop, []);

  return (
    <div
      className={`flex items-stretch border ${disabled ? "border-line-1" : "border-line-2"}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        disabled={disabled}
        className="pressable flex h-11 w-11 items-center justify-center text-frost-1 transition-none hov:bg-ink-3 hov:text-frost-0 disabled:text-frost-2"
        onPointerDown={() => start(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        aria-label={`Decrease ${label}`}
      >
        <span className="t-readout">-</span>
      </button>
      <button
        type="button"
        onClick={onOpenKeypad}
        disabled={disabled}
        className={`t-readout flex h-11 min-w-[92px] items-center justify-center gap-1 border-x px-2 transition-none hov:bg-ink-3 ${
          disabled ? "border-line-1 text-frost-2" : "border-line-2 text-frost-0"
        }`}
        aria-label={`${label}: ${value} ${suffix}. Edit`}
      >
        {value === 0 ? "BW" : value}
        {value === 0 ? null : <span className="text-frost-2">{suffix}</span>}
      </button>
      <button
        type="button"
        disabled={disabled}
        className="pressable flex h-11 w-11 items-center justify-center text-frost-1 transition-none hov:bg-ink-3 hov:text-frost-0 disabled:text-frost-2"
        onPointerDown={() => start(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        aria-label={`Increase ${label}`}
      >
        <span className="t-readout">+</span>
      </button>
    </div>
  );
}

/** Numeric keypad sheet body. Avoids the OS keyboard mid-workout. */
export function Keypad({ value, onChange, onDone }: { value: number; onChange: (v: number) => void; onDone: () => void }) {
  const [draft, setDraft] = useState(String(value ?? ""));
  const push = (k: string) => {
    setDraft((d) => {
      if (k === "del") return d.slice(0, -1);
      if (k === "." && d.includes(".")) return d;
      if (d.length > 5) return d;
      return d + k;
    });
  };
  return (
    <div className="px-4 pb-6">
      <output className="t-hero-num block py-6 text-center text-ember" style={{ fontSize: 56 }}>
        {draft || "0"}
      </output>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => push(k)}
            className="pressable t-readout h-14 border border-line-2 bg-ink-2 text-frost-0 transition-none hov:bg-ink-3"
            aria-label={k === "del" ? "Delete" : k}
          >
            {k === "del" ? "DEL" : k}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="pressable t-readout mt-3 h-14 w-full bg-ember text-on-ember transition-none"
        onClick={() => {
          const n = Number(draft);
          onChange(Number.isFinite(n) ? n : 0);
          onDone();
        }}
      >
        Set weight
      </button>
    </div>
  );
}
