"use client";

import { useEffect, useState } from "react";
import { CoreGauge } from "@/components/system/CoreGauge";
import { IconOffline, IconSearch } from "@/components/icons";
import { useGame } from "@/lib/store/GameProvider";

/**
 * The app bar carries CORE on every /app route and never remounts, so a
 * heat transfer always has somewhere to land. Anchored during page
 * transitions (see globals.css view-transition rules).
 */
export function AppBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const progress = useGame((s) => s.progress);
  const offline = useOffline();

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 h-(--appbar) border-b border-line-1 bg-ink-1 lg:left-(--rail)"
      style={{ viewTransitionName: "wa-appbar" }}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center gap-4 px-4">
        {progress ? (
          <CoreGauge into={progress.levelInto} span={progress.levelSpan} level={progress.level} />
        ) : (
          <div className="h-2.5 flex-1 bg-ink-2" aria-hidden />
        )}

        {offline ? (
          <span className="t-micro hidden items-center gap-1.5 text-glacier sm:inline-flex" role="status">
            <IconOffline size={14} />
            OFFLINE. SAVED LOCALLY.
          </span>
        ) : null}

        <button
          type="button"
          onClick={onOpenPalette}
          className="pressable hidden h-9 items-center gap-2 border border-line-2 px-3 text-frost-2 transition-none hov:border-frost-2 hov:text-frost-0 lg:inline-flex"
          aria-label="Open command palette"
        >
          <IconSearch size={15} />
          <span className="t-micro">CMD K</span>
        </button>
      </div>
    </header>
  );
}

function useOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline;
}
