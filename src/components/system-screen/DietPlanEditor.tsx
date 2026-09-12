"use client";

import { useState } from "react";
import { Button, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { Field } from "@/components/system/Field";
import { IconClose, IconPlus } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { planTotals } from "@/lib/engine/day";
import type { DietPlan, MealDef } from "@/lib/engine/types";

/** Editing meals writes a new diet plan version; logged days keep theirs. */
export function DietPlanEditor() {
  const snapshot = useGame((s) => s.snapshot);
  const { actions, dispatch } = useGameActions();
  // null means "untouched": the current plan version is shown as-is.
  const [edited, setEdited] = useState<DietPlan | null>(null);
  const [dirty, setDirty] = useState(false);

  const current = snapshot?.dietPlans.reduce((a, b) => (b.version > a.version ? b : a));

  if (!snapshot || !current) return <Placeholder height={320} />;

  // The draft falls back to the live plan until the first edit.
  const draft = edited ?? current;

  const update = (next: DietPlan) => {
    setEdited(next);
    setDirty(true);
  };
  const patch = (id: string, p: Partial<MealDef>) =>
    update({ ...draft, meals: draft.meals.map((m) => (m.id === id ? { ...m, ...p } : m)) });

  const totals = planTotals(draft);

  return (
    <>
      <PageHeader
        title="Diet plan"
        meta={<span className="t-micro text-frost-2">EDITING V{current?.version}</span>}
        action={
          <Button
            variant="primary"
            size="sm"
            disabled={!dirty}
            onClick={async () => {
              dispatch(await actions.saveDietPlan({ meals: draft.meals }));
              setEdited(null);
              setDirty(false);
            }}
          >
            Save as new version
          </Button>
        }
      />

      <Panel title="Plan totals" className="mb-4">
        <dl className="grid grid-cols-4 gap-px border-t border-line-1 bg-line-1">
          {[
            ["PROTEIN", `${totals.protein} G`],
            ["CARBS", `${totals.carbs} G`],
            ["FAT", `${totals.fat} G`],
            ["CALORIES", `${totals.kcal}`],
          ].map(([k, v]) => (
            <div key={k} className="surface-well px-3 py-3">
              <dt className="t-micro text-frost-2">{k}</dt>
              <dd className="t-readout mt-1 text-frost-0">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Meals" meta={`${draft.meals.length} PER DAY`}>
        <ul className="border-t border-line-1">
          {draft.meals.map((meal) => (
            <li key={meal.id} className="row-rule px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="TIME" type="time" value={meal.time} onChange={(v) => patch(meal.id, { time: v })} />
                    <div className="col-span-2">
                      <Field label="NAME" value={meal.name} onChange={(v) => patch(meal.id, { name: v })} />
                    </div>
                  </div>
                  <Field
                    label="ITEMS"
                    value={meal.items.join(", ")}
                    onChange={(v) => patch(meal.id, { items: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                    helper="Separate items with a comma."
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <Field label="P" type="number" value={meal.protein} onChange={(v) => patch(meal.id, { protein: Number(v) || 0 })} />
                    <Field label="C" type="number" value={meal.carbs} onChange={(v) => patch(meal.id, { carbs: Number(v) || 0 })} />
                    <Field label="F" type="number" value={meal.fat} onChange={(v) => patch(meal.id, { fat: Number(v) || 0 })} />
                    <Field label="KCAL" type="number" value={meal.kcal} onChange={(v) => patch(meal.id, { kcal: Number(v) || 0 })} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => update({ ...draft, meals: draft.meals.filter((m) => m.id !== meal.id) })}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center text-frost-2 transition-none hov:text-fault"
                  aria-label={`Remove ${meal.name}`}
                >
                  <IconClose size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-line-1 p-3">
          <Button
            className="w-full"
            onClick={() =>
              update({
                ...draft,
                meals: [
                  ...draft.meals,
                  {
                    id: `meal-${Date.now()}`,
                    time: "12:00",
                    name: "New meal",
                    items: ["Item"],
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    kcal: 0,
                    group: null,
                  },
                ],
              })
            }
          >
            <IconPlus size={15} />
            Add meal
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
