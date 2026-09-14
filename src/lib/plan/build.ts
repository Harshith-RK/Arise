import type { DietPlan, SupplyItem, WorkoutPlan } from "@/lib/engine/types";
import { generateDiet } from "./generate-diet";
import { generateWorkout } from "./generate-workout";
import { formulaSession, REPS } from "./rules";
import type { PlanInput, PlanRefusal, PlanTargets } from "./targets";

export type BuildInput = PlanInput & {
  restDays: readonly string[];
  gymStart: string;
  gymEnd: string;
  vegetarian: boolean;
  noEggs: boolean;
  noWhey: boolean;
};

export type BuiltPlans = {
  workout: Omit<WorkoutPlan, "version" | "createdAt">;
  diet: Omit<DietPlan, "version" | "createdAt">;
  supplies: SupplyItem[];
  /** Each weekday's meals add up to its own totals; this is their average. */
  dayTotals: { kcal: number; protein: number; carbs: number; fat: number };
  totalsByDay: Record<string, { kcal: number; protein: number; carbs: number; fat: number }>;
};

/**
 * Both plans from one profile. `override` is what the Hunter typed over the
 * calculation, and wins. A refused profile has no calculated targets, so it
 * builds only from override numbers, and trains at the gentlest prescription.
 */
export function buildPlans(
  input: BuildInput,
  targets: PlanTargets | PlanRefusal,
  override: { kcal: number | null; proteinG: number | null } = { kcal: null, proteinG: null },
): BuiltPlans | null {
  const calc = targets.refused ? null : targets;
  const kcal = override.kcal ?? calc?.kcal ?? null;
  const proteinG = override.proteinG ?? calc?.proteinG ?? null;
  if (kcal === null || proteinG === null) return null;

  // Fat holds its calculated share, or 30% of intake without one. Carbs take
  // the rest, so any override still adds up.
  const fatG = calc && override.kcal === null ? calc.fatG : Math.round((kcal * 0.3) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  const diet = generateDiet({
    kcal,
    proteinG,
    carbsG,
    fatG,
    prefs: {
      vegetarian: input.vegetarian,
      noEggs: input.noEggs,
      noWhey: input.noWhey,
      lowSodium: (input.conditions ?? []).includes("hypertension"),
    },
    gymStart: input.gymStart,
    gymEnd: input.gymEnd,
  });

  const session = calc
    ? { split: calc.split, weeklySets: calc.weeklySets, repRange: calc.repRange }
    : (() => {
        const s = formulaSession({ days: input.days, experience: "beginner", equipment: input.equipment, goal: "maintain", injuries: input.injuries });
        return { split: s.split, weeklySets: s.weeklySets, repRange: REPS.maintain };
      })();

  const workout = generateWorkout({
    ...session,
    restDays: input.restDays,
    gymStart: input.gymStart,
    gymEnd: input.gymEnd,
    equipment: input.equipment,
    experience: calc ? input.experience : "beginner",
    injuries: input.injuries ?? [],
  });

  return {
    workout,
    // Monday doubles as the default day, for any code still reading `meals`.
    diet: { meals: diet.days.mon, days: diet.days },
    supplies: diet.supplies,
    dayTotals: diet.average,
    totalsByDay: diet.totals,
  };
}
