"use client";

import { m, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconPause, IconPlay, IconTimer } from "@/components/icons";
import { EASE, vibrate } from "@/lib/motion";
import { dismissRest, extendRest, pauseRest, resumeRest, secondsLeft, useRest } from "@/lib/rest-timer";
import { useGame } from "@/lib/store/GameProvider";

/**
 * Rest timer. Docks above the bottom nav when a set is logged, counts down,
 * and gets out of the way. Tap to pause, +30s to extend, close to dismiss.
 *
 * Lives in the shell rather than on the quest screen, because a rest outlasts
 * whatever page the Challenger wanders to while it runs.
 */
export function RestTimer() {
  const rest = useRest();
  const sound = useGame((s) => s.snapshot?.settings.sound ?? false);
  const running = rest.endsAt !== null;
  const paused = rest.pausedWith !== null;
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef<number | null>(null);

  // The tick only moves the clock on. What is left is worked out from it at
  // render, so a throttled tab catches up instead of falling behind.
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running, paused]);

  const remaining = secondsLeft(rest, now);

  // Rung once per rest, by the end it was given.
  useEffect(() => {
    if (!running || remaining > 0 || rang.current === rest.endsAt) return;
    rang.current = rest.endsAt;
    vibrate([20, 60, 20]);
    if (sound) beep();
  }, [running, remaining, rest.endsAt, sound]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const ratio = rest.total === 0 ? 0 : remaining / rest.total;

  return (
    <AnimatePresence>
      {running ? (
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
              onClick={() => (paused ? resumeRest() : pauseRest())}
              className="pressable flex h-11 w-11 items-center justify-center text-frost-1 transition-none hov:text-frost-0"
              aria-label={paused ? "Resume rest timer" : "Pause rest timer"}
            >
              {paused ? <IconPlay size={16} /> : <IconPause size={16} />}
            </button>
            <button
              type="button"
              onClick={() => extendRest(30)}
              className="pressable t-micro h-11 px-2 text-frost-1 transition-none hov:text-frost-0"
              aria-label="Add thirty seconds"
            >
              +30
            </button>
            <button
              type="button"
              onClick={dismissRest}
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
