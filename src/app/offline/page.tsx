import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  description: "Winter Arc works without a connection.",
};

/**
 * Only reached when a route was never cached and the network is gone. The
 * app itself keeps working offline: the data never needed the network.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="t-display-2 text-glacier">OFFLINE</h1>
      <p className="t-small text-frost-1">
        This screen has not been opened on this device yet, so there is no copy of it here. Everything you have already
        logged is safe and still on this device.
      </p>
      <Link
        href="/app/quest"
        className="pressable t-readout inline-flex h-14 items-center bg-ember px-6 text-on-ember transition-none"
      >
        Return to quest
      </Link>
    </main>
  );
}
