"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { GameProvider, useGame } from "@/lib/store/GameProvider";
import { AppBar } from "./AppBar";
import { AppNav } from "./AppNav";
import { RolloverWatcher } from "./RolloverWatcher";
import { SystemToaster } from "@/components/system/SystemToaster";
import { Button, Placeholder } from "@/components/system/primitives";
import { useEffect } from "react";
import { hasWelcome, withoutWelcome } from "@/lib/welcome";
import type { Progress } from "@/lib/engine/derive";

// Rare surfaces: kept out of the first load so the quest screen paints fast.
const CeremonyHost = dynamic(() => import("@/components/ceremonies/CeremonyHost").then((m) => m.CeremonyHost), { ssr: false });
const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), { ssr: false });
const RestTimer = dynamic(() => import("@/components/quest/RestTimer").then((m) => m.RestTimer), { ssr: false });
// The sequence is a rare surface, so it is fetched on demand. Its ground is
// painted the moment it is asked for, or the app would show through for as
// long as the chunk takes to arrive, which is the flash this replaced.
const BootSequence = dynamic(() => import("@/components/awaken/BootSequence").then((m) => m.BootSequence), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[70] bg-ink-0" aria-hidden />,
});

/**
 * The /app shell. data-scope="app" is what makes rank temperature apply:
 * the ember tokens warm here as the Challenger ranks up, while marketing
 * surfaces outside keep the full brand ember.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <GameProvider>
        <div data-scope="app" className="min-h-[100dvh] bg-ink-0">
          <Gate>{children}</Gate>
        </div>
      </GameProvider>
    </LazyMotion>
  );
}

/** Routes the three shell states: loading, needs onboarding, ready. */
function Gate({ children }: { children: ReactNode }) {
  const status = useGame((s) => s.status);
  const error = useGame((s) => s.error);
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const progress = useGame((s) => s.progress);
  const name = useGame((s) => s.snapshot?.profile?.name ?? null);

  // Welcome back, once per sign-in. Read from the address rather than kept in
  // state, so it survives the redirect chain that sign-in goes through.
  const welcomeRequested = useSyncExternalStore(
    noSubscription,
    () => hasWelcome(window.location.search),
    () => false,
  );
  const [welcomed, setWelcomed] = useState(false);
  // The sequence covers the wait rather than following it: it starts on the
  // first paint after sign-in and the arc loads behind it, so there is no
  // flash of a half-built screen before the System speaks. A Challenger on their
  // way to onboarding is not welcomed back; that flow has its own sequence.
  const showWelcome = welcomeRequested && !welcomed && status !== "onboarding";

  useEffect(() => {
    if (status === "onboarding") router.replace("/awaken");
  }, [status, router]);

  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 className="t-display-2 text-fault">SYSTEM FAULT</h1>
        <p className="t-small text-frost-1">{error ?? "The log could not be read."}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </main>
    );
  }

  return (
    <>
      <AppBar onOpenPalette={() => setPaletteOpen(true)} />
      <AppNav />
      <main
        id="wa-main"
        className="mx-auto max-w-[1200px] px-4 pb-[calc(var(--bottomnav)+env(safe-area-inset-bottom)+24px)] pt-[calc(var(--appbar)+20px)] lg:pb-16 lg:pl-[calc(var(--rail)+24px)] lg:pr-6"
      >
        {status === "loading" || status === "onboarding" ? <ShellSkeleton /> : children}
      </main>
      <CeremonyHost />
      {/* A rest outlasts the screen that started it. */}
      <RestTimer />
      <SystemToaster />
      <RolloverWatcher />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {showWelcome ? (
        <BootSequence
          lines={welcomeLines(name, progress)}
          // The panel holds until the arc is here, so the marker only comes off
          // the address when there is a real screen to hand over to.
          ready={status === "ready"}
          onDone={() => {
            setWelcomed(true);
            router.replace(withoutWelcome(pathname ?? "/app/quest", window.location.search), { scroll: false });
          }}
        />
      ) : null}
    </>
  );
}

const noSubscription = () => () => {};

/** What the System says to a returning Challenger: who they are and where they stand. */
function welcomeLines(name: string | null, progress: Progress | null): string[] {
  // Three lines from the first frame, whether or not the arc has loaded yet:
  // the panel reserves a slot per line, and each is written as it plays.
  if (!progress) return ["SYSTEM RECONNECTED", name ? `WELCOME BACK, ${name.toUpperCase()}` : "WELCOME BACK, CHALLENGER", "READING YOUR RECORD"];
  const streak = Math.max(0, ...Object.values(progress.streaks).map((s) => (s.state === "broken" ? 0 : s.count)));
  const standing =
    streak > 0
      ? `STREAK ${streak} / LEVEL ${progress.level} / RANK ${progress.rank}`
      : `LEVEL ${progress.level} / RANK ${progress.rank} / DAY ${progress.arcDay}`;
  return ["SYSTEM RECONNECTED", name ? `WELCOME BACK, ${name.toUpperCase()}` : "WELCOME BACK, CHALLENGER", standing];
}

/** Structural placeholder matching the quest layout, not a spinner. */
function ShellSkeleton() {
  return (
    <div className="space-y-4">
      <Placeholder height={132} />
      <Placeholder height={220} />
      <Placeholder height={180} />
    </div>
  );
}
