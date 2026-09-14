import { DEFAULT_SETTINGS, seedDietPlan, seedProfile, seedSupplies, seedWorkoutPlan } from "@/lib/data/seed";
import { addDays, dayKeyOf, todayKey } from "@/lib/engine/dates";
import { mealsFor } from "@/lib/engine/day";
import { DAY_KEYS, type DayKey, type Snapshot, type WorkoutPlan, type DayLog } from "@/lib/engine/types";

/**
 * The demo must always have a workout to clear, whatever day of the week a
 * visitor arrives on. The five training splits are rotated so the first one
 * lands on today and the rest days fall behind it.
 */
function rotateSplitOntoToday(plan: WorkoutPlan, today: string): WorkoutPlan {
  const training = (["mon", "tue", "wed", "thu", "fri"] as DayKey[]).map((d) => plan.days[d]);
  const start = DAY_KEYS.indexOf(dayKeyOf(today));
  const days = { ...plan.days };
  for (const d of DAY_KEYS) days[d] = { title: "Rest", exerciseIds: [] };
  training.forEach((day, i) => {
    days[DAY_KEYS[(start + i) % DAY_KEYS.length]] = day;
  });
  return { ...plan, days };
}

/**
 * Sandbox data for the landing page demo. Synthetic but honest: it is the
 * same engine and the same plan, with a short history so the demo has a
 * level and a streak to move. Never touches the real database.
 */
export function demoSnapshot(): Snapshot {
  const today = todayKey();
  const workout = rotateSplitOntoToday(seedWorkoutPlan(), today);
  const diet = seedDietPlan();
  const base = seedProfile(addDays(today, -11));
  // Rest days follow the rotation, so the demo stays self-consistent.
  const restDays = DAY_KEYS.filter((d) => (workout.days[d]?.exerciseIds.length ?? 0) === 0);
  const profile = { ...base, restDays };

  const logs: DayLog[] = [];
  // Eleven days behind: every meal and cardio done, weekday workouts cleared.
  for (let i = 11; i >= 1; i--) {
    const date = addDays(today, -i);
    const day = workout.days[dayKeyOf(date)];
    const isRest = profile.restDays.includes(dayKeyOf(date));
    const log: DayLog = {
      date,
      workoutPlanVersion: 1,
      dietPlanVersion: 1,
      exercises: {},
      meals: Object.fromEntries(mealsFor(diet, date).map((m) => [m.id, { eaten: true, override: null }])),
      cardio: { done: true, kcal: 200 + (i % 3) * 20, minutes: 45 },
      bonus: { done: isRest },
      sleep: null,
      updatedAt: `${date}T21:00:00.000Z`,
    };
    if (!isRest) {
      for (const id of day.exerciseIds) {
        const def = workout.exercises[id];
        // Bodyweight movements stay at zero: "Pull Ups, last 2 KG" reads as a bug.
        const load = def.bodyweight ? 0 : 30 + ((id.length * 5) % 40) + (11 - i) * 0.5;
        log.exercises[id] = {
          variantId: def.variants[0].id,
          sets: Array.from({ length: def.targetSets }, () => ({
            done: true,
            weight: load,
            reps: def.variants[0].repsMin,
          })),
        };
      }
    }
    logs.push(log);
  }

  return {
    profile,
    settings: DEFAULT_SETTINGS,
    workoutPlans: [workout],
    dietPlans: [diet],
    dayLogs: logs,
    weighIns: [
      { date: addDays(today, -11), weightKg: 95.5, bodyFatPct: 35.3, muscleKg: 34.9, visceral: 14 },
      { date: addDays(today, -4), weightKg: 94.6, bodyFatPct: 34.8, muscleKg: 34.9, visceral: 13 },
    ],
    supplies: seedSupplies(today),
  };
}
