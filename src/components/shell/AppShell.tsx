"use client";

import { useState, type ReactNode } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { GameProvider, useGame } from "@/lib/store/GameProvider";
import { AppBar } from "./AppBar";
import { AppNav } from "./AppNav";
import { RolloverWatcher } from "./RolloverWatcher";
import { SystemToaster } from "@/components/system/SystemToaster";
import { Button, Placeholder } from "@/components/system/primitives";
import { useEffect } from "react";

// Rare surfaces: kept out of the first load so the quest screen paints fast.
const CeremonyHost = dynamic(() => import("@/components/ceremonies/CeremonyHost").then((m) => m.CeremonyHost), { ssr: false });
const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), { ssr: false });

/**
 * The /app shell. data-scope="app" is what makes rank temperature apply:
 * the ember tokens warm here as the Hunter ranks up, while marketing
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
      <SystemToaster />
      <RolloverWatcher />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
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
