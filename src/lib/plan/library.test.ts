import { describe, expect, it } from "vitest";
import { DietPlanSchema, WorkoutPlanSchema, DAY_KEYS } from "@/lib/engine/types";
import modelJson from "./model.json";
import type { PlanModel } from "./model";
import { buildPlans, type BuildInput } from "./build";
import { planTargets } from "./targets";
import { FOOD_BY_ID, FOODS, kcalPer100 } from "./library/foods";
import { MEAL_TEMPLATES } from "./library/meals";
import { EXERCISE_BY_ID, EXERCISES, GEAR_FOR } from "./library/exercises";
import type { Equipment, Experience } from "./rules";

const model = modelJson as unknown as PlanModel;

const base: BuildInput = {
  weightKg: 95.5,
  heightCm: 175.5,
  age: 22,
  sex: "male",
  bodyFatPct: 35.3,
  days: 5,
  goal: "cut",
  experience: "intermediate",
  equipment: "full",
  conditions: [],
  injuries: [],
  restDays: ["sat", "sun"],
  gymStart: "19:00",
  gymEnd: "21:00",
  vegetarian: true,
  noEggs: true,
  noWhey: true,
};

const build = (over: Partial<BuildInput> = {}) => {
  const input = { ...base, ...over };
  const t = planTargets(input, model);
  const plans = buildPlans(input, t);
  if (!plans) throw new Error("no plans");
  return { input, t, plans };
};

/** Every meal across the generated week. */
const weekMeals = (plans: { diet: { meals: { items: string[]; name: string }[]; days?: Partial<Record<string, { items: string[]; name: string }[]>> } }) =>
  Object.values(plans.diet.days ?? { mon: plans.diet.meals }).flat() as { items: string[]; name: string }[];

/** Food ids that went into a generated diet, read back from the item lines. */
const foodsIn = (meals: { items: string[] }[]) =>
  FOODS.filter((f) => meals.some((m) => m.items.some((i) => i === f.name || i.startsWith(`${f.name} `))));

describe("food library", () => {
  it("has unique ids and sane macros", () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    for (const f of FOODS) {
      expect(f.per100.p + f.per100.c + f.per100.f, f.id).toBeLessThanOrEqual(100.5);
      expect(kcalPer100(f), f.id).toBeLessThanOrEqual(905);
      expect(f.min, f.id).toBeLessThanOrEqual(f.max);
      if (f.unit === "piece") expect(f.pieceGrams, f.id).toBeGreaterThan(0);
    }
  });

  it("every template references real foods", () => {
    for (const t of MEAL_TEMPLATES) for (const c of t.components) for (const id of c.foods) expect(FOOD_BY_ID[id], `${t.id}: ${id}`).toBeTruthy();
  });
});

describe("exercise library", () => {
  it("has unique ids, and every swap exists", () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) for (const s of e.swaps) expect(EXERCISE_BY_ID[s], `${e.id} -> ${s}`).toBeTruthy();
  });

  it("covers every muscle with no equipment at all", () => {
    for (const m of ["chest", "back", "quads", "hams", "glutes", "delts", "biceps", "triceps", "calves"]) {
      expect(EXERCISES.some((e) => e.muscle === m && e.gear.every((g) => GEAR_FOR.none.has(g))), m).toBe(true);
    }
  });
});

describe("generated plans", () => {
  it("land on the targets every day of the default week", () => {
    const { t, plans } = build();
    if (t.refused) throw new Error("refused");
    for (const [day, tot] of Object.entries(plans.totalsByDay)) {
      expect(Math.abs(tot.kcal - t.kcal) / t.kcal, day).toBeLessThan(0.05);
      expect((tot.protein - t.proteinG) / t.proteinG, day).toBeGreaterThan(-0.05);
    }
  });

  it("gives every weekday its own meals", () => {
    const { plans } = build();
    const days = DAY_KEYS.map((d) => plans.diet.days?.[d]?.map((m) => m.name).join("|"));
    expect(days.every(Boolean)).toBe(true);
    // No day repeats the one before it, and the week is not a couple of days on rotation.
    for (let i = 1; i < days.length; i++) expect(days[i], DAY_KEYS[i]).not.toBe(days[i - 1]);
    expect(new Set(days).size).toBe(7);
    expect(new Set(weekMeals(plans).map((m) => m.name)).size).toBeGreaterThanOrEqual(15);
  });

  it("meal ids are unique across the week", () => {
    const { plans } = build();
    const ids = DAY_KEYS.flatMap((d) => plans.diet.days![d]!.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("are valid plans the app can store", () => {
    const { plans } = build();
    expect(WorkoutPlanSchema.safeParse({ ...plans.workout, version: 1, createdAt: "x" }).success).toBe(true);
    expect(DietPlanSchema.safeParse({ ...plans.diet, version: 1, createdAt: "x" }).success).toBe(true);
  });

  it("rest days carry no exercises, training days do", () => {
    const { plans } = build({ restDays: ["wed", "sun"] });
    for (const d of DAY_KEYS) {
      const day = plans.workout.days[d];
      if (d === "wed" || d === "sun") expect(day.exerciseIds).toEqual([]);
      else expect(day.exerciseIds.length, d).toBeGreaterThan(0);
    }
  });

  it("weekly sets match what the model prescribed", () => {
    const { t, plans } = build();
    if (t.refused) throw new Error("refused");
    const prescribed = Object.values(t.weeklySets).reduce((a, b) => a + b, 0);
    let generated = 0;
    for (const d of DAY_KEYS) for (const id of plans.workout.days[d].exerciseIds) generated += plans.workout.exercises[id].targetSets;
    expect(Math.abs(generated - prescribed)).toBeLessThanOrEqual(3);
  });

  it("a vegetarian never gets meat, and no eggs means no eggs", () => {
    const { plans } = build();
    for (const f of foodsIn(weekMeals(plans))) {
      expect(f.diet, f.id).not.toBe("meat");
      expect(f.diet, f.id).not.toBe("egg");
      expect(f.whey, f.id).toBeFalsy();
    }
  });

  it("a non-vegetarian sees meat or fish at a main meal", () => {
    const { plans } = build({ vegetarian: false, noEggs: false, noWhey: false });
    expect(foodsIn(weekMeals(plans)).some((f) => f.diet === "meat")).toBe(true);
  });

  it("high blood pressure excludes high-sodium foods", () => {
    const { plans } = build({ vegetarian: false, noEggs: false, conditions: ["hypertension"] });
    for (const f of foodsIn(weekMeals(plans))) expect(f.highSodium, f.id).toBeFalsy();
  });

  it("an injury removes every movement that aggravates it", () => {
    for (const injury of ["knee", "shoulder", "lower_back", "elbow"]) {
      const { plans } = build({ injuries: [injury] });
      for (const id of Object.keys(plans.workout.exercises)) {
        expect(EXERCISE_BY_ID[id].avoid, `${injury}: ${id}`).not.toContain(injury);
        for (const v of plans.workout.exercises[id].variants.slice(1)) {
          const swap = EXERCISE_BY_ID[v.id.split(".")[1]];
          expect(swap.avoid, `${injury}: swap ${swap.id}`).not.toContain(injury);
        }
      }
    }
  });

  it("uses only the equipment a Hunter has", () => {
    for (const equipment of ["none", "dumbbell", "gym", "full"] as Equipment[]) {
      const { plans } = build({ equipment });
      for (const id of Object.keys(plans.workout.exercises)) {
        for (const g of EXERCISE_BY_ID[id].gear) expect(GEAR_FOR[equipment].has(g), `${equipment}: ${id} needs ${g}`).toBe(true);
      }
    }
  });

  it("a refused profile builds only from the numbers it was given", () => {
    const input = { ...base, sex: "female" as const, conditions: ["pregnancy"] };
    const t = planTargets(input, model);
    expect(buildPlans(input, t)).toBeNull();
    const plans = buildPlans(input, t, { kcal: 2200, proteinG: 90 });
    expect(plans).not.toBeNull();
    for (const tot of Object.values(plans!.totalsByDay)) expect(Math.abs(tot.kcal - 2200) / 2200).toBeLessThan(0.07);
  });

  // The sweep: every combination below must produce plans the app can store,
  // with meals near target and no rule broken.
  it("holds across bodies, diets, equipment, experience and schedules", () => {
    let checked = 0;
    let worstKcal = 0;
    let worstProteinUnder = 0;
    for (const sex of ["male", "female"] as const)
      for (const weightKg of [50, 72, 95, 130])
        for (const vegetarian of [true, false])
          for (const equipment of ["none", "dumbbell", "full"] as Equipment[])
            for (const experience of ["beginner", "advanced"] as Experience[])
              for (const [restDays, gymStart, gymEnd] of [
                [["sat", "sun"], "19:00", "21:00"],
                [["tue", "thu", "sat", "sun"], "06:00", "07:00"],
                [["sun"], "12:00", "13:30"],
              ] as const) {
                const { t, plans } = build({ sex, weightKg, bodyFatPct: sex === "male" ? 22 : 32, vegetarian, noEggs: vegetarian, equipment, experience, restDays: [...restDays], gymStart, gymEnd, days: 7 - restDays.length });
                if (t.refused) continue;
                checked++;
                expect(WorkoutPlanSchema.safeParse({ ...plans.workout, version: 1, createdAt: "x" }).success).toBe(true);
                expect(DietPlanSchema.safeParse({ ...plans.diet, version: 1, createdAt: "x" }).success).toBe(true);
                for (const tot of Object.values(plans.totalsByDay)) {
                  worstKcal = Math.max(worstKcal, Math.abs(tot.kcal - t.kcal) / t.kcal);
                  worstProteinUnder = Math.min(worstProteinUnder, (tot.protein - t.proteinG) / t.proteinG);
                }
                for (const d of DAY_KEYS) {
                  const times = plans.diet.days![d]!.map((m) => m.time);
                  expect([...times].sort()).toEqual(times);
                }
              }
    expect(checked).toBeGreaterThan(250);
    expect(worstKcal, "worst kcal miss").toBeLessThan(0.08);
    // Protein may run over (harmless), and never comes in more than 6% short.
    expect(worstProteinUnder, "worst protein shortfall").toBeGreaterThan(-0.06);
    // ~290 full weeks at ~40 ms each: a slow test, not a slow feature.
  }, 90_000);
});
