import { DEFAULT_SETTINGS, seedDietPlan, seedProfile, seedSupplies, seedWorkoutPlan } from "../src/lib/data/seed";
import { addDays, dayKeyOf, toKey } from "../src/lib/engine/dates";
import { deriveProgress } from "../src/lib/engine/derive";
import type { DayLog, Snapshot } from "../src/lib/engine/types";

/**
 * A backup whose logs put the Hunter well past level 5, so a test can reach the
 * state where VITALITY, and with it Recovery logging, unlocks. Built at run time
 * rather than committed, because every date in it is relative to today.
 */
export function buildLevel5Backup(days = 40): { json: string; level: number } {
  const today = toKey(new Date());
  const start = addDays(today, -days);
  const workoutPlan = seedWorkoutPlan(`${start}T00:00:00.000Z`);
  const dietPlan = seedDietPlan(`${start}T00:00:00.000Z`);

  const dayLogs: DayLog[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const exercises: DayLog["exercises"] = {};
    for (const id of workoutPlan.days[dayKeyOf(date)]?.exerciseIds ?? []) {
      const def = workoutPlan.exercises[id];
      if (!def) continue;
      exercises[id] = {
        variantId: def.variants[0].id,
        sets: Array.from({ length: def.targetSets }, () => ({ done: true, weight: def.bodyweight ? 0 : 40, reps: 10 })),
      };
    }
    const meals: DayLog["meals"] = {};
    for (const m of dietPlan.meals) meals[m.id] = { eaten: true, override: null };
    dayLogs.push({
      date,
      workoutPlanVersion: 1,
      dietPlanVersion: 1,
      exercises,
      meals,
      cardio: { done: true, kcal: 200, minutes: 30 },
      bonus: { done: false },
      sleep: null,
      updatedAt: `${date}T21:00:00.000Z`,
    });
  }

  const data: Snapshot = {
    profile: seedProfile(start),
    settings: DEFAULT_SETTINGS,
    workoutPlans: [workoutPlan],
    dietPlans: [dietPlan],
    dayLogs,
    weighIns: [],
    supplies: seedSupplies(start),
  };

  const level = deriveProgress(data, today).level;
  if (level < 5) throw new Error(`backup only reaches level ${level}; raise days`);
  return { json: JSON.stringify({ format: "winter-arc-export", version: 1, exportedAt: new Date().toISOString(), data }), level };
}
