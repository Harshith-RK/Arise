"use client";

import { useState } from "react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { SystemWindow } from "@/components/system/SystemWindow";
import { Meter, Odometer, Panel, Placeholder, Readout } from "@/components/system/primitives";
import { RankPlaque } from "@/components/system/RankPlaque";
import { StreakCard } from "./StreakCard";
import { WeighInSheet } from "./WeighInSheet";
import { StreakCalendar } from "./StreakCalendar";
import { IconLock, IconScale } from "@/components/icons";
import { useGame } from "@/lib/store/GameProvider";
import { RANK_TITLES, rankForLevel, xpForLevel } from "@/lib/engine/xp";
import { tdeeFor } from "@/lib/plan/rules";
import { trainingDays } from "@/lib/plan/from-profile";
import type { StatKey, StreakCategory } from "@/lib/engine/derive";

const STAT_LABEL: Record<StatKey, string> = {
  strength: "Strength",
  stamina: "Stamina",
  discipline: "Discipline",
  vitality: "Vitality",
};

export function StatusScreen() {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  const [weighIn, setWeighIn] = useState(false);
  const [calendar, setCalendar] = useState<StreakCategory | null>(null);

  if (!snapshot?.profile || !progress) {
    return (
      <div className="space-y-4">
        <Placeholder height={220} />
        <Placeholder height={180} />
      </div>
    );
  }

  const { profile } = snapshot;
  const today = progress.days[progress.today];
  const current = progress.latestWeighIn?.weightKg ?? profile.startWeightKg;
  const lost = profile.startWeightKg - current;
  const toGo = current - profile.targetWeightKg;
  // Same activity scale the Targets panel uses, so the two screens agree.
  const tdee = Math.round(tdeeFor(profile.bmr, trainingDays(profile.restDays), profile.conditions ?? []));
  const deficit = tdee - profile.kcalTarget;
  const nextRankLevel = (Math.floor(progress.level / 10) + 1) * 10;
  const xpToRank = xpForLevel(nextRankLevel) - progress.xp;
  const gatesCleared = [
    today?.workoutMandatory ? today.workoutComplete : null,
    today?.dietComplete,
    today?.cardioComplete,
  ].filter((v) => v !== null);
  const clearedCount = gatesCleared.filter(Boolean).length;

  return (
    <>
      {/* Focal: the Hunter card */}
      <SystemWindow className="mb-4" bodyClassName="px-5 py-6 sm:px-7">
        <div className="flex items-center gap-4 sm:gap-6">
          <RankPlaque rank={progress.rank} size={56} title={`Rank ${progress.rank}`} className="shrink-0 sm:h-[72px] sm:w-[72px]" />
          <div className="min-w-0 flex-1">
            <h1 className="t-title truncate text-frost-0 sm:t-display-2">{profile.name}</h1>
            <p className="t-micro mt-1 text-frost-2">
              RANK {progress.rank} / {RANK_TITLES[progress.rank].toUpperCase()}
            </p>
            <p className="t-micro mt-0.5 text-frost-2">
              ARC DAY {progress.arcDay}
              {profile.arcLength ? ` OF ${profile.arcLength}` : null}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="t-num text-ember" style={{ fontSize: 40, lineHeight: 1 }}>
              <Odometer value={progress.level} />
            </p>
            <p className="t-micro mt-1 text-frost-2">LEVEL</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <Readout className="text-frost-1">Core</Readout>
            <span className="t-micro text-frost-2">
              {progress.levelInto} / {progress.levelSpan} XP TO LEVEL {progress.level + 1}
            </span>
          </div>
          <Meter
            value={progress.levelInto}
            max={progress.levelSpan}
            cells={24}
            height={12}
            label="Experience toward next level"
            valueText={`${progress.levelInto} of ${progress.levelSpan} XP`}
          />
          <p className="t-micro mt-2 text-frost-2">
            {progress.rank === "S"
              ? `${progress.xp} XP TOTAL`
              : `${xpToRank} XP TO RANK ${rankForLevel(nextRankLevel)}`}
          </p>
        </div>

        <Link
          href="/app/quest"
          className="pressable t-micro mt-6 flex h-12 items-center justify-between border border-line-2 px-4 text-frost-1 transition-none hov:border-ember hov:text-ember"
        >
          <span>
            {clearedCount} OF {gatesCleared.length} GATES CLEARED TODAY
          </span>
          <span aria-hidden>&gt;</span>
        </Link>
      </SystemWindow>

      {/* Stats */}
      <Panel title="Attributes" className="mb-4">
        <div className="grid gap-px bg-line-1 sm:grid-cols-2">
          {(Object.keys(STAT_LABEL) as StatKey[]).map((key) => {
            const stat = progress.stats[key];
            return (
              <Popover.Root key={key}>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    className="pressable surface-well px-4 py-4 text-left transition-none hov:bg-ink-3"
                    aria-label={`${STAT_LABEL[key]}: ${stat.locked ? "locked" : stat.value}. How it grows.`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-readout text-frost-1">{STAT_LABEL[key]}</span>
                      {stat.locked ? (
                        <IconLock size={15} className="text-frost-2" />
                      ) : (
                        <span className="t-num text-frost-0" style={{ fontSize: 26 }}>
                          {stat.value}
                        </span>
                      )}
                    </div>
                    <Meter
                      className="mt-2"
                      value={stat.locked ? 0 : stat.toNext}
                      max={1}
                      cells={10}
                      height={8}
                      color={stat.locked ? "var(--ink-3)" : "var(--ember)"}
                      label={`${STAT_LABEL[key]} progress to next point`}
                      valueText={stat.nextLabel}
                    />
                    <p className="t-micro mt-2 text-frost-2">{stat.nextLabel}</p>
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={8}
                    className="z-50 max-w-[280px] border border-line-2 bg-ink-1 px-4 py-3"
                  >
                    <p className="t-readout text-frost-0">{STAT_LABEL[key]}</p>
                    <p className="t-small mt-1.5 text-frost-1">{stat.rule}</p>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            );
          })}
        </div>
      </Panel>

      {/* Streaks */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {(["workout", "diet", "cardio"] as StreakCategory[]).map((c) => (
          <StreakCard key={c} streak={progress.streaks[c]} onOpen={() => setCalendar(c)} />
        ))}
      </div>

      {/* Body */}
      <Panel
        title="Body"
        action={
          <button
            type="button"
            onClick={() => setWeighIn(true)}
            className="pressable t-micro flex h-9 items-center gap-2 border border-line-2 px-3 text-frost-1 transition-none hov:border-ember hov:text-ember"
          >
            <IconScale size={14} />
            LOG WEIGH-IN
          </button>
        }
        meta={progress.weighInDue ? "DUE THIS WEEK" : undefined}
      >
        <div className="border-t border-line-1 px-4 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="t-num text-frost-0" style={{ fontSize: 44 }}>
                {current.toFixed(1)}
                <span className="t-micro ml-1.5 text-frost-2">KG</span>
              </p>
              <p className="t-micro mt-1 text-frost-2">
                {lost > 0 ? `${lost.toFixed(1)} KG DOWN` : "NO CHANGE YET"} / {toGo.toFixed(1)} KG TO TARGET
              </p>
            </div>
            <dl className="flex gap-6">
              <div>
                <dt className="t-micro text-frost-2">BODY FAT</dt>
                <dd className="t-readout mt-0.5 text-frost-0">
                  {progress.latestWeighIn?.bodyFatPct ?? profile.bodyFatPct ?? "-"}%
                </dd>
              </div>
              <div>
                <dt className="t-micro text-frost-2">VISCERAL</dt>
                <dd className="t-readout mt-0.5 text-frost-0">
                  {progress.latestWeighIn?.visceral ?? profile.visceral ?? "-"}
                </dd>
              </div>
            </dl>
          </div>

          <WeightRule
            start={profile.startWeightKg}
            current={current}
            phase1={profile.phase1TargetKg}
            target={profile.targetWeightKg}
          />

          <div className="mt-6 grid gap-px border border-line-1 bg-line-1 sm:grid-cols-3">
            <Cell label="ESTIMATED TDEE" value={`${tdee} KCAL`} />
            {/* The target applies on training days only, so these two are
                labelled for the days they actually govern. */}
            <Cell label="TRAINING DAY INTAKE" value={`${profile.kcalTarget} KCAL`} />
            <Cell
              label="TRAINING DAY DEFICIT"
              value={`${deficit} KCAL`}
              tone={deficit < 250 ? "var(--glacier)" : "var(--ember)"}
            />
          </div>
          {deficit < 250 ? (
            <p className="t-micro mt-3 text-glacier">
              A deficit under 250 kcal moves slowly. Lower the calorie target in System to speed the arc up.
              Rest days carry no target.
            </p>
          ) : null}
        </div>
      </Panel>

      <WeighInSheet open={weighIn} onOpenChange={setWeighIn} />
      <StreakCalendar category={calendar} onClose={() => setCalendar(null)} />
    </>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="surface-well px-4 py-3">
      <p className="t-micro text-frost-2">{label}</p>
      <p className="t-readout mt-1" style={{ color: tone ?? "var(--frost-0)" }}>
        {value}
      </p>
    </div>
  );
}

/** Start, current and target on a single rule. */
function WeightRule({ start, current, phase1, target }: { start: number; current: number; phase1: number; target: number }) {
  const span = Math.max(0.1, start - target);
  const pos = (kg: number) => `${Math.max(0, Math.min(100, ((start - kg) / span) * 100))}%`;
  return (
    <div className="mt-6">
      <div className="relative h-2 bg-ink-3">
        <div className="absolute inset-y-0 left-0 bg-ember" style={{ width: pos(current) }} />
        <span className="absolute -top-1 h-4 w-0.5 bg-brass" style={{ left: pos(phase1) }} aria-hidden />
      </div>
      <div className="mt-2 flex justify-between">
        <span className="t-micro text-frost-2">START {start.toFixed(1)}</span>
        <span className="t-micro text-brass">PHASE 1 {phase1.toFixed(1)}</span>
        <span className="t-micro text-frost-2">TARGET {target.toFixed(1)}</span>
      </div>
    </div>
  );
}
