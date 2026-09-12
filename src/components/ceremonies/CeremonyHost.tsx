"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Ceremony } from "@/lib/ceremony";
import { useCeremonyQueue } from "@/lib/store/GameProvider";
import { LevelUpCeremony } from "./LevelUpCeremony";
import { RankUpCeremony } from "./RankUpCeremony";
import { DayClearedSeal } from "./DayClearedSeal";

/**
 * Plays one ceremony at a time from the queue. Mounted once inside the app
 * shell, above the page content.
 */
export function CeremonyHost() {
  const queue = useCeremonyQueue();
  const [current, setCurrent] = useState<Ceremony | null>(null);

  useEffect(() => queue.subscribe(setCurrent), [queue]);

  const done = useCallback(() => {
    setCurrent(null);
    queue.advance();
  }, [queue]);

  return (
    <AnimatePresence>
      {current?.kind === "level_up" ? (
        <LevelUpCeremony key="level" from={current.from} to={current.to} statDeltas={current.statDeltas} onDone={done} />
      ) : null}
      {current?.kind === "rank_up" ? <RankUpCeremony key="rank" from={current.from} to={current.to} onDone={done} /> : null}
      {current?.kind === "day_cleared" ? (
        <DayClearedSeal key="seal" arcDay={current.arcDay} dayXp={current.dayXp} onDone={done} />
      ) : null}
    </AnimatePresence>
  );
}
