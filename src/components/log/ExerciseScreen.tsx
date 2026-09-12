"use client";

import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Button, EmptyState, Panel, PageHeader, Placeholder } from "@/components/system/primitives";
import dynamic from "next/dynamic";
import type { Point } from "@/components/charts/LineChart";

const LineChart = dynamic(() => import("@/components/charts/LineChart").then((m) => m.LineChart), { ssr: false });
import { IconRecord, IconTrash } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { epley, round1, setScore } from "@/lib/engine/pr";
import { formatShort } from "@/lib/engine/dates";
import { notify } from "@/components/system/notify";

/** One exercise: its record, estimated max trend, and full session history. */
export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  const { actions, dispatch } = useGameActions();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const def = useMemo(() => {
    if (!snapshot) return null;
    for (const plan of [...snapshot.workoutPlans].sort((a, b) => b.version - a.version)) {
      if (plan.exercises[exerciseId]) return plan.exercises[exerciseId];
    }
    return null;
  }, [snapshot, exerciseId]);

  const history = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.dayLogs
      .filter((l) => l.exercises[exerciseId]?.sets.some((s) => s.done))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((l) => {
        const ex = l.exercises[exerciseId];
        const done = ex.sets.filter((s) => s.done);
        const top = done.reduce((b, s) => (setScore(s.weight, s.reps) > setScore(b.weight, b.reps) ? s : b), done[0]);
        return {
          date: l.date,
          variantId: ex.variantId,
          sets: done.length,
          weight: top.weight ?? 0,
          reps: top.reps ?? 0,
          e1rm: round1(epley(top.weight ?? 0, top.reps ?? 0)),
        };
      });
  }, [snapshot, exerciseId]);

  if (!snapshot || !progress) return <Placeholder height={320} />;
  if (!def) {
    return (
      <Panel>
        <EmptyState title="EXERCISE NOT FOUND" body="This exercise is not in any version of your plan." />
      </Panel>
    );
  }

  const best = def.variants
    .map((v) => progress.bestByVariant[v.id])
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0];

  const chartPoints: Point[] = history.filter((h) => h.e1rm > 0).map((h) => ({ date: h.date, value: h.e1rm }));

  return (
    <>
      <PageHeader
        title={def.variants[0].name}
        meta={
          <span className="t-micro text-frost-2">
            {def.muscleRegion.toUpperCase()} / {def.targetSets} SETS
          </span>
        }
      />

      {best ? (
        <div className="mb-4 flex items-center gap-4 border border-brass bg-ink-1 px-4 py-4">
          <IconRecord size={20} className="shrink-0 text-brass" />
          <div>
            <p className="t-micro text-brass">PERSONAL RECORD</p>
            <p className="t-title mt-1 text-frost-0">
              {best.weight ? `${best.weight} KG` : "BODYWEIGHT"} x {best.reps}
            </p>
            <p className="t-micro mt-1 text-frost-2">
              {best.e1rm > 0 ? `E1RM ${best.e1rm} KG / ` : ""}
              {formatShort(best.date)}
            </p>
          </div>
        </div>
      ) : null}

      {chartPoints.length > 1 ? (
        <Panel title="Estimated one-rep max" className="mb-4">
          <div className="px-4 py-4">
            <LineChart points={chartPoints} unit="KG" label={`${def.variants[0].name} estimated one-rep max`} decimals={1} />
          </div>
        </Panel>
      ) : null}

      <Panel title="Session history" meta={`${history.length} SESSIONS`}>
        {history.length ? (
          <ul className="border-t border-line-1">
            {[...history].reverse().map((h) => {
              const variant = def.variants.find((v) => v.id === h.variantId);
              return (
                <li key={h.date} className="row-rule flex items-center gap-3 px-4 py-3">
                  <span className="t-micro w-[58px] shrink-0 text-frost-2">{formatShort(h.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body block text-frost-0">
                      {h.weight ? `${h.weight} KG` : "BW"} x {h.reps}
                    </span>
                    <span className="t-micro mt-0.5 block text-frost-2">
                      {h.sets} SETS{h.e1rm > 0 ? ` / E1RM ${h.e1rm} KG` : ""}
                      {variant && variant.id !== def.variants[0].id ? ` / ${variant.name.toUpperCase()}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(h.date)}
                    className="pressable flex h-11 w-11 shrink-0 items-center justify-center text-frost-2 transition-none hov:text-fault"
                    aria-label={`Delete session from ${formatShort(h.date)}`}
                  >
                    <IconTrash size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="NO SESSIONS LOGGED"
            body="Clear this exercise on the Quest screen and the weight you used shows up here, with your estimated max over time."
          />
        )}
      </Panel>

      <Drawer.Root open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[75] bg-ink-0/70" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[76] mx-auto w-full max-w-[440px] border-t border-line-2 bg-ink-1 outline-none">
            <Drawer.Title className="sr-only">Delete session</Drawer.Title>
            <Drawer.Description className="sr-only">Remove this exercise from that day&apos;s log.</Drawer.Description>
            <div className="mx-auto mt-3 h-1 w-10 bg-line-2" aria-hidden />
            <div className="px-4 py-5">
              <h2 className="t-title text-frost-0">Delete this session?</h2>
              <p className="t-small mt-2 text-frost-1">
                The sets logged on {confirmDelete ? formatShort(confirmDelete) : ""} are removed and the XP they earned is
                taken back. Records recalculate.
              </p>
              <div className="mt-5 flex gap-3">
                <Button className="flex-1" onClick={() => setConfirmDelete(null)}>
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    const date = confirmDelete;
                    setConfirmDelete(null);
                    if (!date) return;
                    void (async () => {
                      const outcome = await actions.reopenExercise(date, exerciseId);
                      dispatch(outcome);
                      notify({ tag: "Rollback", text: "Session cleared from the log.", tone: "neutral" });
                    })();
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
