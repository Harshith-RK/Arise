"use client";

import { useState } from "react";
import { DAY_KEYS, type DayKey } from "@/lib/engine/types";
import { Choice } from "@/components/system/Choice";
import { DAY_TITLES, formatTime } from "@/lib/engine/dates";
import type { BuiltPlans } from "@/lib/plan/build";

/**
 * The plans the System built, before they are accepted: every meal with its
 * portions, and every training day with its movements. Collapsed by default so
 * Confirm stays readable; the totals line says the part most people check.
 */
const DAY_OPTIONS = DAY_KEYS.map((d) => ({ value: d, label: DAY_TITLES[d].slice(0, 3).toUpperCase() }));

export function PlanPreview({ plans }: { plans: BuiltPlans }) {
  const { diet, workout, dayTotals, totalsByDay } = plans;
  const [day, setDay] = useState<DayKey>("mon");
  const meals = diet.days?.[day] ?? diet.meals;
  const totals = totalsByDay[day] ?? dayTotals;
  return (
    <div className="space-y-3">
      <details className="border border-line-2">
        <summary className="pressable flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
          <span className="t-readout text-frost-0">Meal plan</span>
          <span className="t-micro text-frost-2">
            A DIFFERENT DAY OF MEALS FOR EACH WEEKDAY
          </span>
        </summary>
        <div className="border-t border-line-1 px-3 py-3">
          <Choice label="DAY" value={day} options={DAY_OPTIONS} onChange={setDay} />
          <p className="t-micro mt-2 text-frost-2">
            {meals.length} MEALS / {totals.kcal} KCAL / {totals.protein} G PROTEIN / {totals.carbs} G CARBS / {totals.fat} G FAT
          </p>
        </div>
        <ol className="border-t border-line-1">
          {meals.map((m) => (
            <li key={m.id} className="border-b border-line-1 px-3 py-2.5 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-small text-frost-0">
                  <span className="t-micro mr-2 text-frost-2">{formatTime(m.time)}</span>
                  {m.name}
                </span>
                <span className="t-micro shrink-0 text-frost-2">{m.kcal} KCAL</span>
              </div>
              <p className="t-micro mt-1 text-frost-2">{m.items.join(" / ").toUpperCase()}</p>
            </li>
          ))}
        </ol>
      </details>

      <details className="border border-line-2">
        <summary className="pressable flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
          <span className="t-readout text-frost-0">Training week</span>
          <span className="t-micro text-frost-2">
            {DAY_KEYS.filter((d) => workout.days[d].exerciseIds.length).length} SESSIONS
          </span>
        </summary>
        <ol className="border-t border-line-1">
          {DAY_KEYS.map((d) => {
            const day = workout.days[d];
            return (
              <li key={d} className="border-b border-line-1 px-3 py-2.5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-small text-frost-0">
                    <span className="t-micro mr-2 text-frost-2">{DAY_TITLES[d].slice(0, 3).toUpperCase()}</span>
                    {day.title}
                  </span>
                </div>
                {day.exerciseIds.length ? (
                  <p className="t-micro mt-1 text-frost-2">
                    {day.exerciseIds
                      .map((id) => {
                        const e = workout.exercises[id];
                        return `${e.variants[0].name} ${e.targetSets}X${e.variants[0].repsMin}-${e.variants[0].repsMax}`;
                      })
                      .join(" / ")
                      .toUpperCase()}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
