"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { createDexieRepo } from "@/lib/data/dexie-repo";
import { createMemoryRepo } from "@/lib/data/memory-repo";
import { createCeremonyQueue, type CeremonyQueue } from "@/lib/ceremony";
import { applySettings, applyRank, markHunter } from "@/lib/prefs";
import { createGameStore, type GameState, type GameStore, type Outcome } from "./game-store";
import { applyOutcome } from "./apply-outcome";
import { notify } from "@/components/system/notify";
import type { Snapshot } from "@/lib/engine/types";

type Ctx = {
  store: GameStore;
  queue: CeremonyQueue;
  dispatch: (outcome: Outcome, ctx?: { exerciseName?: (id: string) => string }) => void;
};

const GameContext = createContext<Ctx | null>(null);

/** Built once per provider; lazy state, not refs, so nothing is read during render. */
function useGameInstance(make: () => { store: GameStore; queue: CeremonyQueue }) {
  const [instance] = useState(make);
  return instance;
}

function makeDispatch(queue: CeremonyQueue): Ctx["dispatch"] {
  return (outcome, ctx) => {
    if (outcome.notice) {
      notify(outcome.notice, { undo: outcome.undo ? () => void outcome.undo?.() : undefined });
    }
    applyOutcome(queue, outcome, ctx);
  };
}

/**
 * The real, persisted game: Dexie repository, mirroring settings and rank
 * onto <html>. Mount once near the root of an app segment.
 */
export function GameProvider({ children }: { children: React.ReactNode }) {
  const { store, queue } = useGameInstance(() => {
    const repo = createDexieRepo();
    return {
      queue: createCeremonyQueue(),
      store: createGameStore(repo, {
        onSettings: applySettings,
        onPersistError: (e) => console.error("Winter Arc: persistence failed", e),
      }),
    };
  });

  useEffect(() => {
    void store.getState().init();
  }, [store]);

  const rank = useStore(store, (s) => s.progress?.rank ?? null);
  useEffect(() => {
    if (rank) applyRank(rank);
  }, [rank]);

  // Mirror "a Hunter exists" so the landing page can route without opening
  // the database.
  const status = useStore(store, (s) => s.status);
  useEffect(() => {
    if (status === "ready") markHunter(true);
    else if (status === "onboarding") markHunter(false);
  }, [status]);

  const value = useMemo<Ctx>(() => ({ store, queue, dispatch: makeDispatch(queue) }), [store, queue]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * Sandbox game for the landing page demo: in-memory, seeded, never
 * persisted, reset on reload. It does not touch the document's skin or rank.
 */
export function SandboxGameProvider({ children, seed }: { children: React.ReactNode; seed: () => Snapshot }) {
  const { store, queue } = useGameInstance(() => ({
    queue: createCeremonyQueue(),
    store: createGameStore(createMemoryRepo(), { seed }),
  }));

  useEffect(() => {
    void store.getState().init();
  }, [store]);

  const value = useMemo<Ctx>(() => ({ store, queue, dispatch: makeDispatch(queue) }), [store, queue]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function useGameContext(): Ctx {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside a GameProvider");
  return ctx;
}

/** Subscribe to a slice of game state. */
export function useGame<T>(selector: (s: GameState) => T): T {
  const { store } = useGameContext();
  return useStore(store, selector);
}

/** Store actions (stable identities) plus the outcome dispatcher. */
export function useGameActions() {
  const { store, dispatch } = useGameContext();
  return { actions: store.getState(), dispatch };
}

export function useCeremonyQueue(): CeremonyQueue {
  return useGameContext().queue;
}
