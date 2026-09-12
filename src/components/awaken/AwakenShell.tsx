"use client";

import { LazyMotion, domAnimation } from "motion/react";
import { GameProvider } from "@/lib/store/GameProvider";
import { SystemToaster } from "@/components/system/SystemToaster";
import { AwakenFlow } from "./AwakenFlow";

/** Onboarding runs on the same game store, outside the app shell chrome. */
export function AwakenShell() {
  return (
    <LazyMotion features={domAnimation} strict>
      <GameProvider>
        <div data-scope="app" className="min-h-[100dvh] bg-ink-0">
          <AwakenFlow />
          <SystemToaster />
        </div>
      </GameProvider>
    </LazyMotion>
  );
}
