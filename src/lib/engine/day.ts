import { dayKeyOf, timeToMinutes } from "./dates";
import { rotatedVersion, type WorkoutRotation } from "./rotation";
import type { DayLog, DietPlan, ExerciseDef, Macros, MealDef, Profile, TrainingDay, WorkoutPlan } from "./types";
import { XP } from "./xp";

/* ==========================================================================
   Evaluate one calendar day against the plan versions it was logged under.
   ========================================================================== */

export type PlanLookup = {
  /** The version a day was logged under; failing that, what `date` trains on. */
  workout: (version?: number, date?: string) => WorkoutPlan;
  diet: (version?: number) => DietPlan;
};

export function makePlanLookup(
  workoutPlans: WorkoutPlan[],
  dietPlans: DietPlan[],
  rotation: WorkoutRotation | null = null,
): PlanLookup {
  const w = [...workoutPlans].sort((a, b) => a.version - b.version);
  const d = [...dietPlans].sort((a, b) => a.version - b.version);
  if (!w.length || !d.length) throw new Error("Plans missing");
  const byVersion = (v: number) => w.find((p) => p.version === v);
  return {
    workout: (v, date) =>
      (v ? byVersion(v) : undefined) ??
      (date ? byVersion(rotatedVersion(w, rotation, date)) : undefined) ??
      w[w.length - 1],
    diet: (v) => (v ? d.find((p) => p.version === v) : undefined) ?? d[d.length - 1],
  };
}

export function isRestDay(date: string, profile: Pick<Profile, "restDays">): boolean {
  return profile.restDays.includes(dayKeyOf(date));
}

export function trainingDayFor(date: string, plan: WorkoutPlan): TrainingDay {
  return plan.days[dayKeyOf(date)] ?? { title: "Rest", exerciseIds: [] };
}

export function setsDone(log: DayLog | undefined, exerciseId: string): number {
  return log?.exercises[exerciseId]?.sets.filter((s) => s.done).length ?? 0;
}

export function exerciseComplete(log: DayLog | undefined, def: ExerciseDef): boolean {
  return setsDone(log, def.id) >= def.targetSets;
}

export function mealMacros(meal: MealDef, log: DayLog | undefined): Macros {
  const o = log?.meals[meal.id]?.override;
  return o ?? { protein: meal.protein, carbs: meal.carbs, fat: meal.fat, kcal: meal.kcal };
}

export type DayResult = {
  date: string;
  dayTitle: string;
  /** A scheduled rest day. Distinct from workoutMandatory, which is also false
   *  on a training day whose plan happens to be empty. */
  isRest: boolean;
  workoutMandatory: boolean;
  exerciseTotal: number;
  exercisesDone: number;
  setsDone: number;
  workoutComplete: boolean;
  mealTotal: number;
  mealsEaten: number;
  dietComplete: boolean;
  cardioComplete: boolean;
  /** Cardio belongs to the training session, so rest days do not ask for it. */
  cardioMandatory: boolean;
  bonusDone: boolean;
  cleared: boolean;
  logged: boolean;
  eaten: Macros;
  xp: number;
  xpBreakdown: { label: string; xp: number }[];
  goodSleep: boolean;
};

export function evaluateDay(
  date: string,
  log: DayLog | undefined,
  plans: PlanLookup,
  profile: Pick<Profile, "restDays">,
): DayResult {
  const wPlan = plans.workout(log?.workoutPlanVersion, date);
  const dPlan = plans.diet(log?.dietPlanVersion);
  const tday = trainingDayFor(date, wPlan);
  const rest = isRestDay(date, profile);
  const defs = tday.exerciseIds.map((id) => wPlan.exercises[id]).filter(Boolean);
  const workoutMandatory = !rest && defs.length > 0;

  let sets = 0;
  let exercisesDone = 0;
  for (const def of defs) {
    sets += Math.min(setsDone(log, def.id), def.targetSets);
    if (exerciseComplete(log, def)) exercisesDone++;
  }
  const workoutComplete = defs.length > 0 && exercisesDone === defs.length;

  const dayMeals = mealsFor(dPlan, date);
  const mealsEaten = dayMeals.filter((m) => log?.meals[m.id]?.eaten).length;
  const dietComplete = mealsEaten === dayMeals.length;
  const cardioComplete = !!log?.cardio.done;
  const cardioMandatory = !rest;
  const bonusDone = !!log?.bonus.done;

  const eaten: Macros = { protein: 0, carbs: 0, fat: 0, kcal: 0 };
  for (const m of dayMeals) {
    if (!log?.meals[m.id]?.eaten) continue;
    const mm = mealMacros(m, log);
    eaten.protein += mm.protein;
    eaten.carbs += mm.carbs;
    eaten.fat += mm.fat;
    eaten.kcal += mm.kcal;
  }

  const xpBreakdown: { label: string; xp: number }[] = [];
  if (exercisesDone) xpBreakdown.push({ label: `${exercisesDone} exercise${exercisesDone > 1 ? "s" : ""}`, xp: exercisesDone * XP.exercise });
  if (workoutComplete) xpBreakdown.push({ label: `${tday.title} cleared`, xp: XP.workoutBonusPerExercise * defs.length });
  if (mealsEaten) xpBreakdown.push({ label: `${mealsEaten} meal${mealsEaten > 1 ? "s" : ""}`, xp: mealsEaten * XP.meal });
  if (dietComplete) xpBreakdown.push({ label: "Diet cleared", xp: XP.dietBonus });
  if (cardioComplete) xpBreakdown.push({ label: "Cardio", xp: XP.cardio });
  if (bonusDone && rest) xpBreakdown.push({ label: "Bonus quest", xp: XP.bonusQuest });
  const xp = xpBreakdown.reduce((s, b) => s + b.xp, 0);

  const cleared =
    (workoutMandatory ? workoutComplete : true) && dietComplete && (cardioMandatory ? cardioComplete : true);

  return {
    date,
    dayTitle: rest ? "Rest" : tday.title,
    isRest: rest,
    workoutMandatory,
    exerciseTotal: defs.length,
    exercisesDone,
    setsDone: sets,
    workoutComplete,
    mealTotal: dayMeals.length,
    mealsEaten,
    dietComplete,
    cardioComplete,
    cardioMandatory,
    bonusDone,
    cleared,
    logged: !!log,
    eaten,
    xp,
    xpBreakdown,
    goodSleep: (log?.sleep?.hours ?? 0) >= 7,
  };
}

/**
 * The meals planned for a date. Always go through this rather than
 * `plan.meals`: a plan can give each weekday its own list.
 */
export function mealsFor(plan: DietPlan, date: string): MealDef[] {
  return plan.days?.[dayKeyOf(date)] ?? plan.meals;
}

/** Planned macros for one day of the plan: `date`, or the default day. */
export function planTotals(plan: DietPlan, date?: string): Macros {
  return (date ? mealsFor(plan, date) : plan.meals).reduce(
    (t, m) => ({ protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat, kcal: t.kcal + m.kcal }),
    { protein: 0, carbs: 0, fat: 0, kcal: 0 },
  );
}

/**
 * Meals cannot be ticked before they happen: the 9:30 PM plate should not be
 * markable at 7 AM. A small grace window allows eating slightly early.
 * Past days are exempt so a missed day can still be back-filled honestly.
 */
export const MEAL_GRACE_MINUTES = 30;

export function mealLocked(date: string, today: string, mealTime: string, now: Date): boolean {
  if (date !== today) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow < timeToMinutes(mealTime) - MEAL_GRACE_MINUTES;
}

/** When a meal becomes tickable, as minutes after midnight. */
export function mealUnlockMinutes(mealTime: string): number {
  return Math.max(0, timeToMinutes(mealTime) - MEAL_GRACE_MINUTES);
}

/** Estimated total daily energy expenditure for a daily-training lifter. */
export function estimateTdee(bmr: number): number {
  return Math.round(bmr * 1.55);
}
