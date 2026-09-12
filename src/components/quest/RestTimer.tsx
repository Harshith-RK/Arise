"use client";

import { m, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconPause, IconPlay, IconTimer } from "@/components/icons";
import { EASE, vibrate } from "@/lib/motion";

/**
 * Rest timer. Docks above the bottom nav when a set is logged, counts down,
 * and gets out of the way. Tap to pause, +30s to extend, close to dismiss.
 */
export function RestTimer({
  seconds,
  runKey,
  sound,
  onClose,
}: {
  seconds: number;
  runKey: number | null;
  sound: boolean;
  onClose: () => void;
}) {
  // The parent remounts this on each new set (key={runKey}), so the
  // countdown simply starts from its initial state.
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (runKey === null || paused) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            vibrate([20, 60, 20]);
            if (sound) beep();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [runKey, paused, sound]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const ratio = seconds === 0 ? 0 : remaining / seconds;

  return (
    <AnimatePresence>
      {runKey !== null ? (
        <m.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE.out }}
          className="fixed inset-x-0 bottom-[calc(var(--bottomnav)+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-6 lg:left-[calc(var(--rail)+24px)] lg:right-auto lg:px-0"
        >
          <div className="mx-auto flex max-w-[560px] items-center gap-3 border border-line-2 bg-ink-1 px-3 py-2 lg:w-[380px]">
            <IconTimer size={18} className={remaining === 0 ? "text-ember" : "text-frost-2"} />
            <span className={`t-readout tabular-nums ${remaining === 0 ? "text-ember" : "text-frost-0"}`}>
              {mm}:{ss}
            </span>
            <div className="relative h-1 flex-1 bg-ink-3" aria-hidden>
              <m.div className="absolute inset-y-0 left-0 bg-ember" animate={{ width: `${ratio * 100}%` }} transition={{ duration: 0.3, ease: "linear" }} />
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="pressable flex h-11 w-11 items-center justify-center text-frost-1 transition-none hov:text-frost-0"
              aria-label={paused ? "Resume rest timer" : "Pause rest timer"}
            >
              {paused ? <IconPlay size={16} /> : <IconPause size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setRemaining((r) => r + 30)}
              className="pressable t-micro h-11 px-2 text-frost-1 transition-none hov:text-frost-0"
              aria-label="Add thirty seconds"
            >
              +30
            </button>
            <button
              type="button"
              onClick={onClose}
              className="pressable flex h-11 w-11 items-center justify-center text-frost-2 transition-none hov:text-frost-0"
              aria-label="Dismiss rest timer"
            >
              <IconClose size={15} />
            </button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    setTimeout(() => void ctx.close(), 600);
  } catch {
    /* audio unavailable */
  }
}
