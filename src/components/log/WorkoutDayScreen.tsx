"use client";

import { useState } from "react";
import Link from "next/link";
import { Reorder, useDragControls } from "motion/react";
import { Panel, Placeholder, ButtonLink, EmptyState } from "@/components/system/primitives";
import { PageHeader } from "@/components/system/primitives";
import { IconForward, IconGrip } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES, dayKeyOf } from "@/lib/engine/dates";
import type { DayKey, ExerciseDef } from "@/lib/engine/types";

/** One training day: its exercises, last weights, and drag to reorder. */
export function WorkoutDayScreen({ day }: { day: DayKey }) {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  const { actions } = useGameActions();
  // null means "not reordering": the plan's own order is the source of truth.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const plan = snapshot?.workoutPlans.reduce((a, b) => (b.version > a.version ? b : a));
  const planDay = plan?.days[day];

  if (!snapshot || !progress || !plan) return <Placeholder height={320} />;

  const isToday = dayKeyOf(progress.today) === day;
  const order = dragOrder ?? planDay?.exerciseIds ?? [];
  const exercises = order.map((id) => plan.exercises[id]).filter(Boolean) as ExerciseDef[];

  return (
    <>
      <PageHeader
        title={planDay?.title && planDay.exerciseIds.length ? planDay.title : "Rest"}
        meta={<span className="t-micro text-frost-2">{DAY_TITLES[day].toUpperCase()}</span>}
        action={isToday ? <ButtonLink href="/app/quest" variant="primary" size="sm">Start session</ButtonLink> : null}
      />

      {exercises.length ? (
        <Panel title="Exercises" meta="DRAG TO REORDER">
          <Reorder.Group
            axis="y"
            values={order}
            onReorder={setDragOrder}
            className="border-t border-line-1"
            as="ul"
          >
            {exercises.map((def) => (
              <ExerciseItem
                key={def.id}
                def={def}
                onCommit={() => {
                  void actions.reorderDay(day, order);
                  setDragOrder(null);
                }}
              />
            ))}
          </Reorder.Group>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            title="REST DAY"
            body="No workout is scheduled. Your workout streak is banked, not broken. An optional bonus quest appears on the Quest screen."
            action={<ButtonLink href="/app/system/plan/workout" size="sm">Edit the plan</ButtonLink>}
          />
        </Panel>
      )}
    </>
  );
}

function ExerciseItem({ def, onCommit }: { def: ExerciseDef; onCommit: () => void }) {
  const controls = useDragControls();
  const progress = useGame((s) => s.progress);
  const best = progress?.bestByVariant[def.variants[0].id];

  return (
    <Reorder.Item
      value={def.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onCommit}
      className="row-rule flex items-center gap-3 bg-ink-1 px-4 py-3"
      as="li"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="pressable flex h-11 w-11 shrink-0 cursor-grab items-center justify-center text-frost-2 transition-none hov:text-frost-0"
        aria-label={`Reorder ${def.variants[0].name}`}
      >
        <IconGrip size={16} />
      </button>
      <Link href={`/app/log/exercise/${def.id}`} className="min-w-0 flex-1">
        <span className="t-body block truncate text-frost-0">{def.variants[0].name}</span>
        <span className="t-micro mt-0.5 block text-frost-2">
          {def.targetSets} x{" "}
          {def.variants[0].repsMin === def.variants[0].repsMax
            ? def.variants[0].repsMin
            : `${def.variants[0].repsMin}-${def.variants[0].repsMax}`}{" "}
          / {def.muscleRegion.toUpperCase()}
          {best ? ` / BEST ${best.weight ? `${best.weight} KG` : "BW"} x ${best.reps}` : ""}
        </span>
      </Link>
      <IconForward size={15} className="shrink-0 text-frost-2" />
    </Reorder.Item>
  );
}
