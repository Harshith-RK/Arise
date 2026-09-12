import type { Rank } from "@/lib/engine/types";

/* ==========================================================================
   Ceremony queue. Ceremonies never overlap. Order: notice (immediate, not
   queued here) > level up > rank up > day seal. A rank up occurring in the
   same action supersedes its level up.
   ========================================================================== */

export type Ceremony =
  | { kind: "level_up"; from: number; to: number; statDeltas: { key: string; delta: number }[] }
  | { kind: "rank_up"; from: Rank; to: Rank }
  | { kind: "day_cleared"; arcDay: number; dayXp: number };

type Listener = (c: Ceremony) => void;

export function createCeremonyQueue() {
  const queue: Ceremony[] = [];
  let playing = false;
  let listener: Listener | null = null;

  function pump() {
    if (playing || !listener || queue.length === 0) return;
    playing = true;
    const next = queue.shift()!;
    listener(next);
  }

  return {
    /** Push a batch from one action; rank_up supersedes level_up from the same batch. */
    push(items: Ceremony[]) {
      const hasRank = items.some((i) => i.kind === "rank_up");
      const filtered = hasRank ? items.filter((i) => i.kind !== "level_up") : items;
      const order: Ceremony["kind"][] = ["level_up", "rank_up", "day_cleared"];
      filtered.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
      queue.push(...filtered);
      pump();
    },
    /** Called by the ceremony host when the current ceremony finishes or is skipped. */
    advance() {
      playing = false;
      pump();
    },
    subscribe(fn: Listener) {
      listener = fn;
      pump();
      return () => {
        if (listener === fn) listener = null;
      };
    },
    clear() {
      queue.length = 0;
      playing = false;
    },
  };
}

export type CeremonyQueue = ReturnType<typeof createCeremonyQueue>;
