import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="t-display-2 text-frost-0">GATE NOT FOUND</h1>
      <p className="t-small text-frost-1">This route does not exist.</p>
      <Link
        href="/app/quest"
        className="pressable t-readout inline-flex h-14 items-center bg-ember px-6 text-on-ember transition-none"
      >
        Return to quest
      </Link>
    </main>
  );
}
