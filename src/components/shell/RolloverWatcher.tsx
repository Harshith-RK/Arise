"use client";

import { useEffect } from "react";
import { todayKey } from "@/lib/engine/dates";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { notify } from "@/components/system/notify";

const BREAK_NOTICE_KEY = "wa:last-break-notice";
const CATEGORY_LABEL: Record<string, string> = { workout: "Workout", diet: "Diet", cardio: "Cardio" };

/**
 * Keeps "today" honest across local midnight and long-lived tabs, and
 * announces a streak that broke while the app was closed (once per break).
 */
export function RolloverWatcher() {
  const { actions } = useGameActions();
  const today = useGame((s) => s.today);
  const streaks = useGame((s) => s.progress?.streaks ?? null);

  useEffect(() => {
    const check = () => {
      const key = todayKey();
      if (key !== today) actions.setToday(key);
    };
    const id = window.setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [actions, today]);

  useEffect(() => {
    if (!streaks) return;
    let seen: Record<string, string> = {};
    try {
      seen = JSON.parse(localStorage.getItem(BREAK_NOTICE_KEY) ?? "{}");
    } catch {
      seen = {};
    }
    let changed = false;
    for (const [category, streak] of Object.entries(streaks)) {
      if (streak.state === "broken" && streak.brokenOn && seen[category] !== streak.brokenOn) {
        notify({
          tag: "Streak Broken",
          text: `${CATEGORY_LABEL[category] ?? category} streak reset. Begin again today.`,
          tone: "fault",
        });
        seen[category] = streak.brokenOn;
        changed = true;
      }
    }
    if (changed) {
      try {
        localStorage.setItem(BREAK_NOTICE_KEY, JSON.stringify(seen));
      } catch {
        /* ignore */
      }
    }
  }, [streaks]);

  return null;
}
