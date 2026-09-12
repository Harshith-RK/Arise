"use client";

import { Drawer } from "vaul";
import { useGame } from "@/lib/store/GameProvider";
import { addDays, formatShort } from "@/lib/engine/dates";
import type { StreakCategory } from "@/lib/engine/derive";

const LABEL: Record<StreakCategory, string> = { workout: "Workout", diet: "Diet", cardio: "Cardio" };

const MARK = {
  done: { bg: "var(--ember)", text: "var(--on-ember)", label: "cleared" },
  missed: { bg: "var(--fault)", text: "var(--ink-0)", label: "missed" },
  rest: { bg: "var(--ink-3)", text: "var(--glacier)", label: "rest" },
  pending: { bg: "var(--ink-2)", text: "var(--frost-2)", label: "still open" },
} as const;

/** The last 8 weeks of a single streak, so a break is easy to find. */
export function StreakCalendar({ category, onClose }: { category: StreakCategory | null; onClose: () => void }) {
  const progress = useGame((s) => s.progress);
  const open = category !== null;
  const streak = category && progress ? progress.streaks[category] : null;
  const today = progress?.today ?? "";
  const days = streak ? Array.from({ length: 56 }, (_, i) => addDays(today, i - 55)) : [];

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[75] bg-ink-0/70" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[76] mx-auto max-h-[88vh] w-full max-w-[520px] overflow-y-auto border-t border-line-2 bg-ink-1 outline-none">
          <Drawer.Title className="sr-only">{category ? LABEL[category] : ""} streak calendar</Drawer.Title>
          <Drawer.Description className="sr-only">The last eight weeks of this streak.</Drawer.Description>
          <div className="mx-auto mt-3 h-1 w-10 bg-line-2" aria-hidden />
          <div className="px-4 py-5">
            <h2 className="t-title text-frost-0">{category ? LABEL[category] : ""} streak</h2>
            <p className="t-micro mt-1 text-frost-2">
              {streak?.count ?? 0} DAYS CURRENT / {streak?.best ?? 0} DAYS BEST
            </p>

            <div className="mt-5 grid grid-cols-7 gap-1">
              {days.map((d) => {
                const mark = streak?.history[d];
                const style = mark ? MARK[mark] : { bg: "var(--ink-2)", text: "var(--frost-2)", label: "no data" };
                return (
                  <div
                    key={d}
                    title={`${formatShort(d)}: ${style.label}`}
                    className="flex aspect-square items-center justify-center"
                    style={{ background: style.bg }}
                  >
                    <span className="text-[9px]" style={{ color: style.text, fontFamily: "var(--font-mono)" }}>
                      {d.slice(-2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <ul className="mt-5 flex flex-wrap gap-4">
              {(Object.keys(MARK) as (keyof typeof MARK)[]).map((k) => (
                <li key={k} className="t-micro flex items-center gap-2 text-frost-2">
                  <span className="h-3 w-3" style={{ background: MARK[k].bg }} aria-hidden />
                  {MARK[k].label.toUpperCase()}
                </li>
              ))}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
