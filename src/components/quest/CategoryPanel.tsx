"use client";

import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "@/lib/motion";
import { IconDown, IconLock } from "@/components/icons";

/**
 * A quest category. Finished categories collapse to one summary line so the
 * active one stays under the thumb.
 */
export function CategoryPanel({
  title,
  Icon,
  done,
  total,
  complete,
  open,
  onToggle,
  summary,
  locked = false,
  children,
}: {
  title: string;
  Icon: (p: { size?: number; className?: string }) => ReactNode;
  done: number;
  total: number;
  complete: boolean;
  open: boolean;
  onToggle: () => void;
  summary?: string;
  /** Visible but not yet earned: a lock replaces the count. It still opens,
   *  so the reason it is locked can be read. */
  locked?: boolean;
  children: ReactNode;
}) {
  const panelId = `quest-panel-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section className="surface-panel">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="pressable flex w-full items-center gap-3 px-4 py-4 text-left transition-none hov:bg-ink-2"
        >
          <Icon size={18} className={complete && !locked ? "text-ember" : "text-frost-2"} />
          <span className={`t-readout flex-1 ${locked ? "text-frost-1" : "text-frost-0"}`}>{title}</span>
          {locked ? (
            <IconLock size={15} className="text-frost-2" />
          ) : (
            <span className={`t-micro ${complete ? "text-ember" : "text-frost-2"}`}>
              {done}/{total}
            </span>
          )}
          <m.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.18, ease: EASE.out }} className="text-frost-2">
            <IconDown size={16} />
          </m.span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            id={panelId}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE.out }}
            className="overflow-hidden border-t border-line-1"
          >
            {children}
          </m.div>
        ) : summary ? (
          <m.p
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="t-micro border-t border-line-1 px-4 py-3 text-frost-2"
          >
            {summary}
          </m.p>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
