"use client";

import { useEffect } from "react";

/**
 * Errors name the problem and offer a way out. Export is offered here
 * because a fault should never be the reason someone loses months of logs.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Winter Arc fault:", error);
  }, [error]);

  const exportData = async () => {
    try {
      const { createDexieRepo } = await import("@/lib/data/dexie-repo");
      const { toExportFile } = await import("@/lib/data/repo");
      const snap = await createDexieRepo().load();
      if (!snap) return;
      const blob = new Blob([JSON.stringify(toExportFile(snap), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "winter-arc-recovery.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* nothing to export */
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="t-display-2 text-fault">SYSTEM FAULT</h1>
      <p className="t-small text-frost-1">
        The log could not be read. Your data is still on this device. Retry, or export a copy before anything else.
      </p>
      {error.digest ? <p className="t-micro text-frost-2">REFERENCE {error.digest}</p> : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="pressable t-readout inline-flex h-14 items-center bg-ember px-6 text-on-ember transition-none"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => void exportData()}
          className="pressable t-readout inline-flex h-14 items-center border border-line-2 px-6 text-frost-1 transition-none hov:border-frost-2 hov:text-frost-0"
        >
          Export data
        </button>
      </div>
    </main>
  );
}
