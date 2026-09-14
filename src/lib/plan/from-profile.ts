import type { Profile } from "@/lib/engine/types";
import type { Equipment, Experience, Goal, Sex } from "./rules";
import type { PlanInput } from "./targets";

/** Cut, maintain or bulk, read from where the Hunter is and where they want to be. */
export function goalFor(startKg: number, targetKg: number): Goal {
  if (targetKg < startKg - 0.5) return "cut";
  if (targetKg > startKg + 0.5) return "bulk";
  return "maintain";
}

/** Training days a week, from the rest days. The model knows 2 to 6. */
export const trainingDays = (restDays: readonly string[]) => Math.max(2, Math.min(6, 7 - restDays.length));

export type PlanFields = {
  sex: Sex | null;
  age: number | null;
  experience: Experience;
  equipment: Equipment;
  conditions: string[];
  injuries: string[];
};

/** What is still missing before a plan can be calculated. */
export function missingForPlan(f: Pick<PlanFields, "sex" | "age">): string[] {
  const out: string[] = [];
  if (!f.sex) out.push("sex");
  if (f.age === null || !Number.isFinite(f.age)) out.push("age");
  return out;
}

/** A plan input from a stored profile, or null if it lacks sex or age. */
export function planInputFromProfile(p: Profile, weightKg = p.startWeightKg): PlanInput | null {
  if (!p.sex || p.age === undefined) return null;
  return {
    weightKg,
    heightCm: p.heightCm,
    age: p.age,
    sex: p.sex,
    bodyFatPct: p.bodyFatPct,
    days: trainingDays(p.restDays),
    goal: goalFor(weightKg, p.targetWeightKg),
    experience: p.experience ?? "intermediate",
    equipment: p.equipment ?? "full",
    conditions: p.conditions ?? [],
    injuries: p.injuries ?? [],
  };
}
