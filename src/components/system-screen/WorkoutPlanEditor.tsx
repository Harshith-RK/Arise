"use client";

import { useState } from "react";
import { Button, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { Field } from "@/components/system/Field";
import { IconClose, IconPlus } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES } from "@/lib/engine/dates";
import type { DayKey, ExerciseDef, WorkoutPlan } from "@/lib/engine/types";

/**
 * Editing the plan writes a new version. Past days keep the version they
 * were logged under, so history never shifts under you.
 */
export function WorkoutPlanEditor() {
  const snapshot = useGame((s) => s.snapshot);
  const { actions, dispatch } = useGameActions();
  // null means "untouched": the current plan version is shown as-is.
  const [edited, setEdited] = useState<WorkoutPlan | null>(null);
  const [day, setDay] = useState<DayKey>("mon");
  const [dirty, setDirty] = useState(false);

  const current = snapshot?.workoutPlans.reduce((a, b) => (b.version > a.version ? b : a));

  if (!snapshot || !current) return <Placeholder height={320} />;

  // The draft falls back to the live plan until the first edit.
  const draft = edited ?? current;

  const ids = draft.days[day]?.exerciseIds ?? [];
  const update = (next: WorkoutPlan) => {
    setEdited(next);
    setDirty(true);
  };

  const patchExercise = (id: string, patch: Partial<ExerciseDef>) =>
    update({ ...draft, exercises: { ...draft.exercises, [id]: { ...draft.exercises[id], ...patch } } });

  const patchVariantName = (id: string, name: string) => {
    const def = draft.exercises[id];
    patchExercise(id, { variants: [{ ...def.variants[0], name }, ...def.variants.slice(1)] });
  };

  const addExercise = () => {
    const newId = `custom-${Date.now()}`;
    update({
      ...draft,
      exercises: {
        ...draft.exercises,
        [newId]: {
          id: newId,
          muscleRegion: "General",
          targetSets: 4,
          bodyweight: false,
          variants: [{ id: `${newId}.a`, name: "New exercise", repsMin: 12, repsMax: 15 }],
        },
      },
      days: { ...draft.days, [day]: { ...draft.days[day], title: draft.days[day]?.title ?? "Training", exerciseIds: [...ids, newId] } },
    });
  };

  const removeExercise = (id: string) =>
    update({ ...draft, days: { ...draft.days, [day]: { ...draft.days[day], exerciseIds: ids.filter((x) => x !== id) } } });

  return (
    <>
      <PageHeader
        title="Workout plan"
        meta={<span className="t-micro text-frost-2">EDITING V{current?.version}</span>}
        action={
          <Button
            variant="primary"
            size="sm"
            disabled={!dirty}
            onClick={async () => {
              dispatch(await actions.saveWorkoutPlan({ days: draft.days, exercises: draft.exercises }));
              setEdited(null);
              setDirty(false);
            }}
          >
            Save as new version
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-7 gap-1">
        {(Object.keys(DAY_TITLES) as DayKey[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === day}
            onClick={() => setDay(d)}
            className="pressable t-micro h-12 border border-line-2 text-frost-2 transition-none aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-on-ember"
          >
            {d.slice(0, 1).toUpperCase()}
          </button>
        ))}
      </div>

      <Panel title={DAY_TITLES[day]} meta={`${ids.length} EXERCISES`}>
        <div className="border-t border-line-1 px-4 py-4">
          <Field
            label="DAY TITLE"
            value={draft.days[day]?.title ?? ""}
            onChange={(v) => update({ ...draft, days: { ...draft.days, [day]: { title: v, exerciseIds: ids } } })}
            helper="Leave the exercise list empty to make this a rest day."
          />
        </div>

        <ul className="border-t border-line-1">
          {ids.map((id) => {
            const def = draft.exercises[id];
            if (!def) return null;
            return (
              <li key={id} className="row-rule px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <Field label="NAME" value={def.variants[0].name} onChange={(v) => patchVariantName(id, v)} />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="REGION" value={def.muscleRegion} onChange={(v) => patchExercise(id, { muscleRegion: v })} />
                      <Field label="SETS" type="number" value={def.targetSets} onChange={(v) => patchExercise(id, { targetSets: Math.max(1, Math.min(10, Number(v) || 1)) })} />
                      <Field
                        label="REPS MIN"
                        type="number"
                        value={def.variants[0].repsMin}
                        onChange={(v) =>
                          patchExercise(id, { variants: [{ ...def.variants[0], repsMin: Number(v) || 1 }, ...def.variants.slice(1)] })
                        }
                      />
                      <Field
                        label="REPS MAX"
                        type="number"
                        value={def.variants[0].repsMax}
                        onChange={(v) =>
                          patchExercise(id, { variants: [{ ...def.variants[0], repsMax: Number(v) || 1 }, ...def.variants.slice(1)] })
                        }
                      />
                    </div>
                    {def.variants.length > 1 ? (
                      <p className="t-micro text-frost-2">ALTERNATE: {def.variants[1].name.toUpperCase()}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExercise(id)}
                    className="pressable flex h-11 w-11 shrink-0 items-center justify-center text-frost-2 transition-none hov:text-fault"
                    aria-label={`Remove ${def.variants[0].name} from ${DAY_TITLES[day]}`}
                  >
                    <IconClose size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line-1 p-3">
          <Button onClick={addExercise} className="w-full">
            <IconPlus size={15} />
            Add exercise
          </Button>
        </div>
      </Panel>

      {dirty ? (
        <p className="t-micro mt-4 text-glacier">
          UNSAVED CHANGES. SAVING CREATES VERSION {(current?.version ?? 1) + 1} AND KEEPS EVERY PAST LOG INTACT.
        </p>
      ) : null}
    </>
  );
}
