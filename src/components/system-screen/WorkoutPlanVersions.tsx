"use client";

import Link from "next/link";
import { ButtonLink, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { IconForward, IconPlus } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES, formatShort } from "@/lib/engine/dates";
import { nextRotationChange, ROTATION_CHOICES, rotatedVersion, rotationLabel, rotationOf } from "@/lib/engine/rotation";
import type { DayKey, WorkoutPlan } from "@/lib/engine/types";

/**
 * The way in to the workout plan: every version saved, which one is being
 * trained this week, and whether they take turns. Editing one is a page of its
 * own, so this screen stays a list of choices rather than a wall of fields.
 */
export function WorkoutPlanVersions() {
  const snapshot = useGame((s) => s.snapshot);
  const today = useGame((s) => s.today);
  const { actions } = useGameActions();

  if (!snapshot) return <Placeholder height={320} />;

  const plans = [...snapshot.workoutPlans].sort((a, b) => a.version - b.version);
  const weeks = snapshot.settings.workoutRotationWeeks ?? 0;
  const rotation = rotationOf(snapshot);
  const activeVersion = rotatedVersion(plans, rotation, today);
  const next = nextRotationChange(plans, rotation, today);
  const newVersion = plans[plans.length - 1].version + 1;

  return (
    <>
      <PageHeader
        title="Workout plan"
        meta={<span className="t-micro text-frost-2">{plans.length} VERSION{plans.length > 1 ? "S" : ""}</span>}
      />

      <Panel title="Versions" className="mb-4">
        <div className="border-t border-line-1">
          {plans.map((p) => (
            <VersionRow key={p.version} plan={p} active={p.version === activeVersion} rotating={!!rotation} />
          ))}
        </div>
        <div className="border-t border-line-1 p-3">
          <ButtonLink href="/app/system/plan/workout/new" className="w-full">
            <IconPlus size={15} />
            Create another version
          </ButtonLink>
          <p className="t-micro mt-2 text-frost-2">
            STARTS FROM VERSION {plans[plans.length - 1].version} AND SAVES AS VERSION {newVersion}. NOTHING ALREADY
            LOGGED CHANGES.
          </p>
        </div>
      </Panel>

      <Panel title="Rotation" meta={rotationLabel(weeks).toUpperCase()}>
        <div className="space-y-4 border-t border-line-1 px-4 py-4">
          <p className="t-small text-frost-1">
            Train your versions in turn: one block on version 1, the next on version 2, then back around. Each turn
            starts on a Monday.
          </p>
          <div className="grid grid-cols-3 gap-1">
            {ROTATION_CHOICES.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={w === weeks}
                onClick={() => void actions.saveSettings({ workoutRotationWeeks: w })}
                className="pressable t-micro h-12 border border-line-2 px-2 text-frost-2 transition-none aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-on-ember"
              >
                {rotationLabel(w).toUpperCase()}
              </button>
            ))}
          </div>
          <p className="t-micro text-frost-2" aria-live="polite">
            {plans.length < 2
              ? "SAVE A SECOND VERSION BEFORE A ROTATION HAS ANYTHING TO TURN."
              : !rotation
                ? `EVERY DAY TRAINS VERSION ${activeVersion}, THE NEWEST.`
                : `THIS WEEK TRAINS VERSION ${activeVersion}.${
                    next ? ` VERSION ${next.version} FROM ${formatShort(next.date).toUpperCase()}.` : ""
                  }`}
          </p>
          {rotation ? (
            <p className="t-micro text-frost-2">
              DAYS ALREADY LOGGED KEEP THE VERSION THEY WERE TRAINED ON. TURNING THIS OFF PUTS EVERY DAY BACK ON THE
              NEWEST VERSION.
            </p>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

function VersionRow({ plan, active, rotating }: { plan: WorkoutPlan; active: boolean; rotating: boolean }) {
  const trainingDays = (Object.keys(DAY_TITLES) as DayKey[]).filter((d) => (plan.days[d]?.exerciseIds.length ?? 0) > 0);
  const titles = trainingDays.map((d) => plan.days[d]!.title);

  return (
    <Link
      href={`/app/system/plan/workout/${plan.version}`}
      className="pressable row-rule flex items-center gap-3 px-4 py-4 transition-none hov:bg-ink-2"
    >
      <span className="min-w-0 flex-1">
        <span className="t-body block text-frost-0">
          Version {plan.version}
          {active ? <span className="t-micro ml-2 text-ember">{rotating ? "THIS WEEK" : "IN USE"}</span> : null}
        </span>
        <span className="t-micro mt-0.5 block text-frost-2">
          {trainingDays.length} TRAINING DAY{trainingDays.length === 1 ? "" : "S"}
          {titles.length ? ` / ${titles.join(", ").toUpperCase()}` : ""}
        </span>
      </span>
      <IconForward size={16} className="text-frost-2" />
    </Link>
  );
}
