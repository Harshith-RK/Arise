"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/system/Tabs";
import { Button, EmptyState, Panel, Placeholder, Readout } from "@/components/system/primitives";
import { SystemWindow } from "@/components/system/SystemWindow";
import dynamic from "next/dynamic";
import type { Point } from "@/components/charts/LineChart";

const LineChart = dynamic(() => import("@/components/charts/LineChart").then((m) => m.LineChart), { ssr: false });
import { Badge } from "@/components/system/Badge";
import { WeighInSheet } from "@/components/status/WeighInSheet";
import { IconScale } from "@/components/icons";
import { useGame } from "@/lib/store/GameProvider";
import { BADGES } from "@/lib/engine/badges";
import { addDays, formatShort } from "@/lib/engine/dates";

type Range = "4w" | "12w" | "all";

export function ProgressScreen() {
  // The tab lives in the URL so a badge link, a bookmark and the browser
  // back button all return to the section you were actually in.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get("tab") === "badges" ? "badges" : "telemetry";
  const setTab = (v: "telemetry" | "badges") =>
    router.replace(`${pathname}?tab=${v}`, { scroll: false });

  return (
    <>
      <Tabs
        label="Progress section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "telemetry", label: "Telemetry" },
          { value: "badges", label: "Badges" },
        ]}
      />
      {tab === "telemetry" ? <Telemetry /> : <Badges />}
    </>
  );
}

function Telemetry() {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  const [range, setRange] = useState<Range>("12w");
  const [weighIn, setWeighIn] = useState(false);

  const cutoff = useMemo(() => {
    if (!progress) return "";
    if (range === "all") return "0000-00-00";
    return addDays(progress.today, range === "4w" ? -28 : -84);
  }, [range, progress]);

  if (!snapshot?.profile || !progress) return <Placeholder height={320} />;

  const weighIns = snapshot.weighIns.filter((w) => w.date >= cutoff).sort((a, b) => (a.date < b.date ? -1 : 1));
  const weight: Point[] = weighIns.map((w) => ({ date: w.date, value: w.weightKg }));
  const fat: Point[] = weighIns.filter((w) => w.bodyFatPct != null).map((w) => ({ date: w.date, value: w.bodyFatPct! }));
  const heightM = snapshot.profile.heightCm / 100;
  const bmi: Point[] = weighIns.map((w) => ({ date: w.date, value: w.weightKg / (heightM * heightM) }));
  const xp: Point[] = progress.xpHistory.filter((p) => p.date >= cutoff).map((p) => ({ date: p.date, value: p.xp }));

  return (
    <>
      {progress.weighInDue ? (
        <SystemWindow className="mb-4" bodyClassName="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <h2 className="t-title text-frost-0">Weigh-in due</h2>
            <p className="t-micro mt-1 text-frost-2">FIRST OF THE WEEK AWARDS 20 XP</p>
          </div>
          <Button variant="primary" onClick={() => setWeighIn(true)}>
            <IconScale size={16} />
            Log weigh-in
          </Button>
        </SystemWindow>
      ) : null}

      <div className="mb-4 flex gap-2">
        {(["4w", "12w", "all"] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className="pressable t-micro h-10 border border-line-2 px-3 text-frost-2 transition-none aria-pressed:border-ember aria-pressed:text-ember"
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      <Panel title="Weight" meta={`${weighIns.length} READINGS`} className="mb-4">
        <div className="px-4 py-4">
          <LineChart
            points={weight}
            target={snapshot.profile.targetWeightKg}
            targetLabel={`TARGET ${snapshot.profile.targetWeightKg}`}
            unit="KG"
            label="Weight trend"
            height={220}
          />
        </div>
      </Panel>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Panel title="Body fat">
          <div className="px-4 py-4">
            <LineChart points={fat} unit="%" label="Body fat trend" height={140} color="var(--glacier)" />
          </div>
        </Panel>
        <Panel title="BMI">
          <div className="px-4 py-4">
            <LineChart points={bmi} unit="BMI" label="BMI trend" height={140} color="var(--glacier)" />
          </div>
        </Panel>
      </div>

      <Panel title="Experience" meta={`LEVEL ${progress.level}`}>
        <div className="px-4 py-4">
          <LineChart points={xp} unit="XP" label="Experience over time" height={160} decimals={0} />
        </div>
      </Panel>

      <WeighInSheet open={weighIn} onOpenChange={setWeighIn} />
    </>
  );
}

function Badges() {
  const progress = useGame((s) => s.progress);
  if (!progress) return <Placeholder height={320} />;

  const unlocked = BADGES.filter((t) => progress.badges[t.id]?.unlockedOn).length;

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <Readout className="text-frost-1">
          {unlocked} of {BADGES.length} earned
        </Readout>
        <span className="t-micro text-frost-2">TAP FOR DETAIL</span>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {BADGES.map((t) => {
          const state = progress.badges[t.id];
          const isUnlocked = !!state?.unlockedOn;
          const target = t.id === "arc-complete" ? Math.max(t.target, state?.current ?? t.target) : t.target;
          return (
            <li key={t.id}>
              <Link
                href={`/app/progress/badges/${t.id}`}
                className={`pressable flex aspect-square flex-col items-center justify-center gap-2 border px-2 text-center transition-none ${
                  isUnlocked ? "border-brass bg-ink-1 hov:bg-ink-2" : "border-line-2 hov:border-frost-2"
                }`}
              >
                <Badge id={t.id} earned={isUnlocked} size={44} />
                <span className={`t-micro leading-tight ${isUnlocked ? "text-frost-0" : "text-frost-2"}`}>{t.name}</span>
                <span className="t-micro text-frost-2">
                  {isUnlocked ? formatShort(state!.unlockedOn!).toUpperCase() : `${state?.current ?? 0} / ${target}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {unlocked === 0 ? (
        <Panel className="mt-4">
          <EmptyState
            title="NOTHING EARNED YET"
            body="Clear a full day to take First Gate. Seven in a row takes the Streak Shield and 200 XP."
          />
        </Panel>
      ) : null}
    </>
  );
}
