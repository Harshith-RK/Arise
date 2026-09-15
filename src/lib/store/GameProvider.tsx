"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { createDexieRepo } from "@/lib/data/dexie-repo";
import { createMemoryRepo } from "@/lib/data/memory-repo";
import { createSupabaseRepo } from "@/lib/data/supabase-repo";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/session";
import { HAS_BACKEND } from "@/lib/supabase/env";
import { usePathname, useRouter } from "next/navigation";
import { subscribeToArc } from "@/lib/supabase/realtime";
import { adoptLocalArc } from "@/lib/supabase/adopt";
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
 * Which store the app is running on.
 *
 *   local  : Dexie on this device, no account. The original product, and what
 *            runs when no backend is configured or nobody is signed in.
 *   remote : Supabase, keyed to a Hunter. Follows them between devices and
 *            updates live.
 */
type Identity = { kind: "local" } | { kind: "remote"; userId: string };

export function GameProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // With accounts on, there is no signed-out app: a session that ends while a
  // page is open (sign out in another tab, expiry) goes to sign in, not to a
  // local store holding nobody's data.
  const mustSignIn = HAS_BACKEND && auth.status === "signed-out";
  useEffect(() => {
    if (mustSignIn) router.replace(`/auth?next=${encodeURIComponent(pathname ?? "/app/quest")}`);
  }, [mustSignIn, router, pathname]);

  // While auth resolves there is nothing to build yet: mounting a local store
  // first would open Dexie and then throw it away a tick later.
  if (auth.status === "loading" || mustSignIn) return <PendingGame>{children}</PendingGame>;

  const identity: Identity =
    auth.status === "signed-in" ? { kind: "remote", userId: auth.userId } : { kind: "local" };

  // Keyed on identity: signing in or out rebuilds the store rather than trying
  // to swap a repository underneath a live snapshot.
  return (
    <GameRuntime key={identity.kind === "remote" ? identity.userId : "local"} identity={identity}>
      {children}
    </GameRuntime>
  );
}

/** Context that never resolves, so the shell shows its loading state. */
function PendingGame({ children }: { children: React.ReactNode }) {
  const { store, queue } = useGameInstance(() => ({
    queue: createCeremonyQueue(),
    store: createGameStore(createMemoryRepo(), {}),
  }));
  const value = useMemo<Ctx>(() => ({ store, queue, dispatch: makeDispatch(queue) }), [store, queue]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * The real, persisted game, mirroring settings and rank onto <html>. Mount once
 * near the root of an app segment.
 */
function GameRuntime({ identity, children }: { identity: Identity; children: React.ReactNode }) {
  const { store, queue } = useGameInstance(() => {
    const db = supabase();
    const repo =
      identity.kind === "remote" && db ? createSupabaseRepo(db, identity.userId) : createDexieRepo();
    return {
      queue: createCeremonyQueue(),
      store: createGameStore(repo, {
        onSettings: applySettings,
        onPersistError: (e) => console.error("Winter Arc: persistence failed", e),
      }),
    };
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const db = supabase();
      // An arc already on this device is adopted into an empty account, so
      // signing in never looks like losing everything.
      if (identity.kind === "remote" && db) {
        try {
          await adoptLocalArc(db, identity.userId);
        } catch (e) {
          console.error("Winter Arc: could not adopt the local arc", e);
        }
      }
      if (!cancelled) await store.getState().init();
    })();
    return () => {
      cancelled = true;
    };
  }, [store, identity]);

  // Live updates. Changes from another device land as a pull, coalesced so a
  // burst of row writes costs one reload.
  useEffect(() => {
    const db = supabase();
    if (identity.kind !== "remote" || !db) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = subscribeToArc(db, identity.userId, () => {
      clearTimeout(timer);
      timer = setTimeout(() => void store.getState().reload(), 250);
    });

    return () => {
      clearTimeout(timer);
      void db.removeChannel(channel);
    };
  }, [store, identity]);

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
