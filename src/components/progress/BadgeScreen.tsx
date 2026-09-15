"use client";

import Link from "next/link";
import { ButtonLink, EmptyState, Meter, Panel, Placeholder } from "@/components/system/primitives";
import { Badge } from "@/components/system/Badge";

import { useGame } from "@/lib/store/GameProvider";
import { BADGE_BY_ID } from "@/lib/engine/badges";
import { formatReadout } from "@/lib/engine/dates";

/** One badge: what it is, how it is earned, and how close you are. */
export function BadgeScreen({ id }: { id: string }) {
  const progress = useGame((s) => s.progress);
  const def = BADGE_BY_ID[id];

  if (!progress) return <Placeholder height={280} />;
  if (!def) {
    return (
      <Panel>
        <EmptyState
          title="NO SUCH BADGE"
          body="That award does not exist."
          action={<ButtonLink href="/app/progress?tab=badges" size="sm">Back to badges</ButtonLink>}
        />
      </Panel>
    );
  }

  const state = progress.badges[id];
  const unlocked = !!state?.unlockedOn;
  const target = def.id === "arc-complete" ? Math.max(def.target, state?.current ?? def.target) : def.target;

  return (
    <>
      <Link href="/app/progress?tab=badges" className="t-micro mb-2 inline-flex min-h-11 items-center text-frost-2 transition-none hov:text-frost-0">
        BACK TO BADGES
      </Link>

      <div className={`border px-5 py-8 text-center ${unlocked ? "border-brass bg-ink-1" : "border-line-2"}`}>
        <div className="flex justify-center">
          <Badge id={def.id} earned={unlocked} size={112} />
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
