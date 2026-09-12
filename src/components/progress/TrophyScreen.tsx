"use client";

import Link from "next/link";
import { ButtonLink, EmptyState, Meter, Panel, Placeholder } from "@/components/system/primitives";
import { RankPlaque } from "@/components/system/RankPlaque";
import { IconLock, IconSeal } from "@/components/icons";
import { useGame } from "@/lib/store/GameProvider";
import { TROPHY_BY_ID } from "@/lib/engine/trophies";
import { formatReadout } from "@/lib/engine/dates";

/** One trophy: what it is, how it is earned, and how close you are. */
export function TrophyScreen({ id }: { id: string }) {
  const progress = useGame((s) => s.progress);
  const def = TROPHY_BY_ID[id];

  if (!progress) return <Placeholder height={280} />;
  if (!def) {
    return (
      <Panel>
        <EmptyState
          title="NO SUCH TROPHY"
          body="That award does not exist."
          action={<ButtonLink href="/app/progress" size="sm">Back to trophies</ButtonLink>}
        />
      </Panel>
    );
  }

  const state = progress.trophies[id];
  const unlocked = !!state?.unlockedOn;
  const target = def.id === "arc-complete" ? Math.max(def.target, state?.current ?? def.target) : def.target;

  return (
    <>
      <Link href="/app/progress" className="t-micro mb-4 inline-block text-frost-2 transition-none hov:text-frost-0">
        BACK TO TROPHIES
      </Link>

      <div className={`border px-5 py-8 text-center ${unlocked ? "border-brass bg-ink-1" : "border-line-2"}`}>
        <div className="flex justify-center">
          {def.rank ? (
            <RankPlaque rank={def.rank} tone={unlocked ? "brass" : "locked"} size={96} />
          ) : unlocked ? (
            <IconSeal size={64} className="text-brass" />
          ) : (
            <IconLock size={48} className="text-line-2" />
          )}
        </div>
        <h1 className="t-display-2 mt-5 text-frost-0">{def.name}</h1>
        <p className="t-small mx-auto mt-3 max-w-[40ch] text-frost-1">{def.rule}</p>

        {unlocked ? (
          <p className="t-micro mt-5 text-brass">EARNED {formatReadout(state!.unlockedOn!).toUpperCase()}</p>
        ) : (
          <div className="mx-auto mt-6 max-w-[280px]">
            <Meter
              value={state?.current ?? 0}
              max={target}
              cells={Math.min(20, target)}
              height={10}
              label={`${def.name} progress`}
              valueText={`${state?.current ?? 0} of ${target} ${def.unit}`}
            />
            <p className="t-micro mt-2 text-frost-2">
              {state?.current ?? 0} / {target} {def.unit}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
