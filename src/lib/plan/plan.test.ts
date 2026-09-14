import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/parity.json";
import modelJson from "./model.json";
import { runRegressor, type PlanModel } from "./model";
import { formulaSession, formulaTargets, KCAL_FLOOR, type Sex } from "./rules";
import { planTargets, type PlanInput } from "./targets";

const model = modelJson as unknown as PlanModel;

const base: PlanInput = {
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
};

describe("model runtime matches the Python export", () => {
  for (const [i, c] of fixture.diet.entries()) {
    it(`${c.path} case ${i}`, () => {
      const heads = model[c.path as "katch" | "mifflin"];
      for (const h of ["kcal", "protein_g", "fat_g"] as const) {
        expect(runRegressor(heads[h], c.x)).toBeCloseTo(c.expected[h], 6);
      }
    });
  }
});

describe("formula port matches ml/rules.py", () => {
  for (const c of fixture.formula) {
    const inp = c.input;
    it(`${inp.sex}, ${inp.weight_kg} kg, ${inp.goal}${inp.conditions.length ? ", " + inp.conditions.join("+") : ""}`, () => {
      const t = formulaTargets({
        weightKg: inp.weight_kg,
        heightCm: inp.height_cm,
        age: inp.age,
        sex: inp.sex as Sex,
        bodyFatPct: inp.bodyfat_pct,
        days: inp.days,
        goal: inp.goal as PlanInput["goal"],
        conditions: inp.conditions,
      });
      expect(t.bmr).toBeCloseTo(c.expected.bmr, 1);
      expect(t.tdee).toBeCloseTo(c.expected.tdee, 1);
      expect(t.kcal).toBeCloseTo(c.expected.kcal, 1);
      expect(t.proteinG).toBeCloseTo(c.expected.protein_g, 1);
      expect(t.carbsG).toBeCloseTo(c.expected.carbs_g, 1);
      expect(t.fatG).toBeCloseTo(c.expected.fat_g, 1);
      expect(t.clamped.join("|")).toBe(c.clamped);
    });
  }

  for (const c of fixture.session) {
    it(`session ${c.input.days}d ${c.input.experience} ${c.input.equipment} ${c.input.goal}`, () => {
      const s = formulaSession({
        days: c.input.days,
        experience: c.input.experience as PlanInput["experience"],
        equipment: c.input.equipment as PlanInput["equipment"],
        goal: c.input.goal as PlanInput["goal"],
        injuries: c.input.injuries,
      });
      expect(s.split).toBe(c.split);
      expect(s.weeklySets).toEqual(c.weekly_sets);
    });
  }
});

describe("plan targets", () => {
  it("uses the model in range and lands on the formula", () => {
    const p = planTargets(base, model);
    if (p.refused) throw new Error("refused");
    expect(p.source).toBe("model");
    expect(Math.abs(p.kcal - 1982)).toBeLessThan(30);
    expect(p.split).toBe("ppl_upper_lower");
  });

  it("macros always add up to the calories", () => {
    const p = planTargets(base, model);
    if (p.refused) throw new Error("refused");
    expect(Math.abs(p.proteinG * 4 + p.carbsG * 4 + p.fatG * 9 - p.kcal)).toBeLessThanOrEqual(6);
  });

  it("falls back to the formula out of range, and says why", () => {
    const p = planTargets({ ...base, weightKg: 240, bodyFatPct: 55 }, model);
    if (p.refused) throw new Error("refused");
    expect(p.source).toBe("formula");
    expect(p.fallbackReason).toMatch(/range/);
  });

  it("falls back to the formula when the model is not loaded", () => {
    const p = planTargets(base, null);
    if (p.refused) throw new Error("refused");
    expect(p.source).toBe("formula");
  });

  it("refuses under 18 and for refusal conditions", () => {
    expect(planTargets({ ...base, age: 16 }, model).refused).toBe(true);
    expect(planTargets({ ...base, sex: "female", conditions: ["pregnancy"] }, model).refused).toBe(true);
    expect(planTargets({ ...base, conditions: ["ckd"] }, model).refused).toBe(true);
  });

  it("hypothyroidism lowers the target", () => {
    const a = planTargets({ ...base, bodyFatPct: null }, model);
    const b = planTargets({ ...base, bodyFatPct: null, conditions: ["hypothyroid"] }, model);
    if (a.refused || b.refused) throw new Error("refused");
    expect(b.kcal).toBeLessThan(a.kcal);
  });

  it("an injury reduces volume for that region", () => {
    const a = planTargets(base, model);
    const b = planTargets({ ...base, injuries: ["knee"] }, model);
    if (a.refused || b.refused) throw new Error("refused");
    expect(b.weeklySets.quads).toBeLessThan(a.weeklySets.quads);
    expect(b.weeklySets.chest).toBe(a.weeklySets.chest);
  });

  // The whole point of the cage. Sweep the trained space and confirm no cut
  // ever lands under BMR, under the floor, or faster than 1% a week.
  it("never breaks a safety clamp across the body grid", () => {
    let checked = 0;
    for (const sex of ["male", "female"] as const) {
      for (let weight = 40; weight <= 160; weight += 8) {
        for (let height = 150; height <= 200; height += 10) {
          for (const bf of [null, 12, 25, 40]) {
            for (const days of [2, 4, 6]) {
              const inp: PlanInput = { ...base, sex, weightKg: weight, heightCm: height, bodyFatPct: bf, days, age: 30 };
              const p = planTargets(inp, model);
              if (p.refused) continue;
              checked++;
              const floor = Math.min(KCAL_FLOOR[sex], p.tdee);
              expect(p.kcal).toBeGreaterThanOrEqual(Math.min(Math.max(p.bmr, floor), p.tdee) - 1);
              expect(p.weeklyKgChange).toBeLessThanOrEqual(weight * 0.01 + 0.02);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
