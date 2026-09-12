"use client";

import { toast } from "sonner";
import type { Notice, NoticeTone } from "@/lib/store/game-store";
import { vibrate } from "@/lib/motion";

/**
 * The System notification (brief 3.4 / 9.K). A headless Sonner toast styled
 * as a small T2 panel: a bracketed Martian Mono tag, then one sentence.
 * Announced via Sonner's built-in aria-live region.
 */
const TONE_COLOR: Record<NoticeTone, string> = {
  ember: "var(--ember)",
  glacier: "var(--glacier)",
  brass: "var(--brass)",
  fault: "var(--fault)",
  neutral: "var(--frost-1)",
};

export function notify(notice: Notice, opts: { undo?: () => void } = {}) {
  vibrate(8);
  const color = TONE_COLOR[notice.tone];
  toast.custom(
    (id) => (
      <div
        className="surface-panel flex w-[min(92vw,380px)] items-start gap-3 px-4 py-3"
        style={{ borderColor: notice.tone === "fault" ? "var(--fault)" : "var(--line-2)" }}
        role="status"
      >
        <span className="mt-0.5 h-1.5 w-1.5 shrink-0" style={{ background: color }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="t-micro" style={{ color }}>
            [{notice.tag}]
          </div>
          <div className="t-small mt-0.5 text-frost-0">{notice.text}</div>
        </div>
        {opts.undo ? (
          <button
            type="button"
            className="pressable t-micro shrink-0 px-2 py-1 text-ember hov:text-core"
            onClick={() => {
              opts.undo?.();
              toast.dismiss(id);
            }}
          >
            Undo
          </button>
        ) : null}
      </div>
    ),
    { duration: opts.undo ? 5000 : 3200 },
  );
}
