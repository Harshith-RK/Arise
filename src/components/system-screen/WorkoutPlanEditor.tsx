"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { Field } from "@/components/system/Field";
import { IconClose, IconPlus } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES } from "@/lib/engine/dates";
import type { DayKey, ExerciseDef, WorkoutPlan } from "@/lib/engine/types";

type NumberKey = "targetSets" | "repsMin" | "repsMax";

const LIMITS: Record<NumberKey, { min: number; max: number; label: string }> = {
  targetSets: { min: 1, max: 10, label: "Sets" },
  repsMin: { min: 1, max: 100, label: "Reps" },
  repsMax: { min: 1, max: 100, label: "Reps" },
};

/**
 * One version of the workout, open for editing. Two ways to save: updating this
 * version corrects it everywhere it is used, including days already logged on
 * it; saving a new version leaves those days scored against what they were
 * logged on. In "copy" mode only the second is offered, because the Challenger came
 * here from "Create another version" and the version they started from stays.
 */
export function WorkoutPlanEditor({ version, mode = "edit" }: { version?: number; mode?: "edit" | "copy" }) {
  const snapshot = useGame((s) => s.snapshot);
  const { actions, dispatch } = useGameActions();
  const router = useRouter();
  // null means "untouched": the current plan version is shown as-is.
  const [edited, setEdited] = useState<WorkoutPlan | null>(null);
  const [day, setDay] = useState<DayKey>("mon");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // What is typed in the number boxes, kept as text so a box can be empty while
  // someone replaces the number. Only a valid number reaches the plan.
  const [texts, setTexts] = useState<Record<string, string>>({});

  const newest = snapshot?.workoutPlans.reduce((a, b) => (b.version > a.version ? b : a));
  const current = (version ? snapshot?.workoutPlans.find((p) => p.version === version) : null) ?? newest;

  if (!snapshot || !current) return <Placeholder height={320} />;

  // The draft falls back to the live plan until the first edit.
  const draft = edited ?? current;

  const ids = draft.days[day]?.exerciseIds ?? [];
  // Which days rest is the profile's business, not the plan's: a rest day can
  // still hold a session, and it stays optional.
  const isRest = (snapshot.profile?.restDays ?? []).includes(day);
  const update = (next: WorkoutPlan) => {
    setEdited(next);
    setDirty(true);
  };

  const patchExercise = (id: string, patch: Partial<ExerciseDef>) =>
    update({ ...draft, exercises: { ...draft.exercises, [id]: { ...draft.exercises[id], ...patch } } });

  /** Write one variant back in place: the movement itself, or one of its alternates. */
  const patchVariant = (def: ExerciseDef, index: number, patch: Partial<ExerciseDef["variants"][number]>) =>
    patchExercise(def.id, { variants: def.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) });

  const LETTERS = "abcdefgh";
  const addVariant = (def: ExerciseDef) => {
    const taken = new Set(def.variants.map((v) => v.id));
    const letter = LETTERS.split("").find((l) => !taken.has(`${def.id}.${l}`)) ?? String(def.variants.length);
    const from = def.variants[0];
    patchExercise(def.id, {
      variants: [...def.variants, { id: `${def.id}.${letter}`, name: "New alternate", repsMin: from.repsMin, repsMax: from.repsMax }],
    });
  };

  const removeVariant = (def: ExerciseDef, index: number) =>
    patchExercise(def.id, { variants: def.variants.filter((_, i) => i !== index) });

  /** Swap an alternate into first place: that is the one a quest opens on. */
  const makeDefault = (def: ExerciseDef, index: number) =>
    patchExercise(def.id, { variants: [def.variants[index], ...def.variants.filter((_, i) => i !== index)] });

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

  // Sets and reps belong to the exercise: every variant shares the range.
  const boxKey = (def: ExerciseDef, key: NumberKey) => `${def.id}:${key}`;
  const numberValue = (def: ExerciseDef, key: NumberKey) =>
    key === "targetSets" ? def.targetSets : def.variants[0][key];

  /** The problem with one number box, or null. Checks what is typed, not what was last valid. */
  const numberError = (def: ExerciseDef, key: NumberKey): string | null => {
    const raw = texts[boxKey(def, key)] ?? String(numberValue(def, key));
    const { min, max, label } = LIMITS[key];
    if (raw.trim() === "") return `Enter ${label.toLowerCase()}`;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) return `${min} to ${max}`;
    if (key === "repsMax") {
      const lo = Number(texts[boxKey(def, "repsMin")] ?? def.variants[0].repsMin);
      if (Number.isInteger(lo) && n < lo) return "Below min";
    }
    return null;
  };

  const setNumber = (def: ExerciseDef, key: NumberKey, raw: string) => {
    setTexts((t) => ({ ...t, [boxKey(def, key)]: raw }));
    setDirty(true);
    const n = Number(raw);
    const { min, max } = LIMITS[key];
    if (raw.trim() === "" || !Number.isInteger(n) || n < min || n > max) return;
    if (key === "targetSets") patchExercise(def.id, { targetSets: n });
    // Every variant keeps the same range: an alternate is the same work.
    else patchExercise(def.id, { variants: def.variants.map((v) => ({ ...v, [key]: n })) });
  };

  // Every exercise in the plan, not only today's, since a save writes all of them.
  const invalid = Object.values(draft.exercises).some((def) =>
    (["targetSets", "repsMin", "repsMax"] as NumberKey[]).some((k) => numberError(def, k)),
  );

  const save = async (how: "update" | "new") => {
    if (invalid || saving) return;
    setSaving(true);
    const body = { days: draft.days, exercises: draft.exercises };
    dispatch(await (how === "update" ? actions.updateWorkoutPlan(body, current.version) : actions.saveWorkoutPlan(body)));
    setEdited(null);
    setTexts({});
    setDirty(false);
    setSaving(false);
    if (how === "new") router.push("/app/system/plan/workout");
  };

  const bar = (
    <SaveBar
      version={current.version}
      nextVersion={newest!.version + 1}
      copy={mode === "copy"}
      invalid={invalid}
      saving={saving}
      onSave={save}
    />
  );

  return (
    <>
      <PageHeader
        title={mode === "copy" ? `New version ${newest!.version + 1}` : `Version ${current.version}`}
        meta={
          <span className="t-micro text-frost-2">
            {mode === "copy" ? `COPIED FROM V${current.version}` : "WORKOUT PLAN"}
          </span>
        }
        action={
          <ButtonLink href="/app/system/plan/workout" size="sm">
            All versions
          </ButtonLink>
        }
      />

      {dirty || mode === "copy" ? bar : null}

      <div className="mb-4 grid grid-cols-4 gap-1 min-[400px]:grid-cols-7">
        {(Object.keys(DAY_TITLES) as DayKey[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === day}
            onClick={() => setDay(d)}
            className="pressable t-micro h-12 border border-line-2 text-frost-2 transition-none aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-on-ember"
          >
            {d.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      <Panel title={DAY_TITLES[day]} meta={isRest ? `REST / ${ids.length} OPTIONAL` : `${ids.length} EXERCISES`}>
        <div className="border-t border-line-1 px-4 py-4">
          <Field
            label="DAY TITLE"
            value={draft.days[day]?.title ?? ""}
            onChange={(v) => update({ ...draft, days: { ...draft.days, [day]: { title: v, exerciseIds: ids } } })}
            helper={
              isRest
                ? "A rest day. Anything here is offered on the quest but never required: name it Abs, Mobility, whatever you might do."
                : "Rest days are chosen in System, under rest days."
            }
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
                    <Field label="NAME" value={def.variants[0].name} onChange={(v) => patchVariant(def, 0, { name: v })} />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="REGION" value={def.muscleRegion} onChange={(v) => patchExercise(id, { muscleRegion: v })} />
                      {([
                        ["targetSets", "SETS"],
                        ["repsMin", "REPS MIN"],
                        ["repsMax", "REPS MAX"],
                      ] as [NumberKey, string][]).map(([key, label]) => (
                        <Field
                          key={key}
                          label={label}
                          type="number"
                          inputMode="numeric"
                          value={texts[boxKey(def, key)] ?? String(numberValue(def, key))}
                          onChange={(v) => setNumber(def, key, v)}
                          error={numberError(def, key)}
                        />
                      ))}
                    </div>

                    {/* Alternates: the swaps offered on the quest when a machine
                        is taken. Each carries its own reps, since a dumbbell
                        version is rarely done for the same range. */}
                    <div className="border-l border-line-1 pl-3">
                      <p className="t-micro text-frost-2">ALTERNATES</p>
                      {def.variants.length < 2 ? (
                        <p className="t-micro mt-1 text-frost-2">NONE. ADD ONE TO SWAP TO IT ON A QUEST.</p>
                      ) : null}
                      <ul className="mt-2 space-y-3">
                        {def.variants.slice(1).map((v, i) => {
                          const vi = i + 1;
                          return (
                            <li key={v.id} className="space-y-2">
                              <div className="flex items-end gap-2">
                                <div className="min-w-0 flex-1">
                                  <Field label={`ALTERNATE ${vi}`} value={v.name} onChange={(t) => patchVariant(def, vi, { name: t })} />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeVariant(def, vi)}
                                  className="pressable mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center text-frost-2 transition-none hov:text-fault"
                                  aria-label={`Remove ${v.name} as an alternate for ${def.variants[0].name}`}
                                >
                                  <IconClose size={15} />
                                </button>
                              </div>
                              {/* An alternate is the same work by another
                                  movement, so it carries the exercise's sets
                                  and reps. Only its name is its own. */}
                              <Button size="sm" onClick={() => makeDefault(def, vi)}>
                                Make the main lift
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                      {def.variants.length < 4 ? (
                        <Button size="sm" className="mt-3" onClick={() => addVariant(def)}>
                          <IconPlus size={14} />
                          Add alternate
                        </Button>
                      ) : (
                        <p className="t-micro mt-2 text-frost-2">FOUR IS THE LIMIT.</p>
                      )}
                    </div>
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

      {dirty || mode === "copy" ? <div className="mt-4">{bar}</div> : null}
    </>
  );
}

/** Both ways to save, and what each one does to days already logged. */
function SaveBar({
  version,
  nextVersion,
  copy,
  invalid,
  saving,
  onSave,
}: {
  version: number;
  nextVersion: number;
  copy: boolean;
  invalid: boolean;
  saving: boolean;
  onSave: (how: "update" | "new") => void;
}) {
  return (
    <Panel title={copy ? "Save as a new version" : "Unsaved changes"} className="mb-4">
      <div className="space-y-4 border-t border-line-1 px-4 py-4">
        {invalid ? (
          <p className="t-micro text-fault" role="alert">
            FIX THE HIGHLIGHTED NUMBERS BEFORE SAVING.
          </p>
        ) : null}
        <div className={`grid gap-3 ${copy ? "" : "sm:grid-cols-2"}`}>
          {copy ? null : (
            <div>
              <Button className="w-full" disabled={invalid || saving} onClick={() => onSave("update")}>
                Update version {version}
              </Button>
              <p className="t-micro mt-2 text-frost-2">
                CORRECTS THIS PLAN EVERYWHERE, INCLUDING DAYS ALREADY LOGGED ON IT. THEIR XP IS RECALCULATED. UNDO IS OFFERED.
              </p>
            </div>
          )}
          <div>
            <Button variant="primary" className="w-full" disabled={invalid || saving} onClick={() => onSave("new")}>
              Save as version {nextVersion}
            </Button>
            <p className="t-micro mt-2 text-frost-2">
              KEPT ALONGSIDE THE OTHERS. DAYS ALREADY LOGGED KEEP THEIR OWN VERSION AND THEIR XP.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
