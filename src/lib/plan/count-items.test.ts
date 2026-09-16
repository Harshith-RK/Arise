import { describe, expect, it } from "vitest";
import { countItem, countItems } from "./count-items";
import { FOOD_BY_ID, kcalPer100 } from "./library/foods";
import { buildPlans, type BuildInput } from "./build";
import { planTargets } from "./targets";
import modelJson from "./model.json";
import type { PlanModel } from "./model";
import { DAY_KEYS } from "@/lib/engine/types";

describe("counting a meal from its items", () => {
  it("reads a weight either side of the food", () => {
    const a = countItem("Paneer 100g");
    const b = countItem("100 g paneer");
    expect(a.food?.id).toBe("paneer");
    expect(b.macros).toEqual(a.macros);
    expect(a.macros.protein).toBeCloseTo(FOOD_BY_ID.paneer.per100.p, 5);
    expect(a.macros.kcal).toBeCloseTo(kcalPer100(FOOD_BY_ID.paneer), 5);
  });

  it("halves and doubles with the amount", () => {
    expect(countItem("Paneer 200g").macros.protein).toBeCloseTo(FOOD_BY_ID.paneer.per100.p * 2, 5);
    expect(countItem("Paneer 50g").macros.protein).toBeCloseTo(FOOD_BY_ID.paneer.per100.p / 2, 5);
  });

  it("counts pieces, and takes a bare piece food as one", () => {
    const two = countItem("Roti x2");
    const one = countItem("Roti");
    expect(two.amount).toBe(2);
    expect(one.amount).toBe(1);
    expect(two.macros.kcal).toBeCloseTo(one.macros.kcal * 2, 5);
  });

  it("ignores how a food was prepared", () => {
    expect(countItem("Rice 150g cooked").food?.id).toBe(countItem("Rice 150g").food?.id);
    expect(countItem("Soya chunks 40g dry").macros.protein).toBeGreaterThan(0);
  });

  it("takes millilitres, and scales a litre", () => {
    const glass = countItem("Milk 200ml");
    const litre = countItem("Milk 1 litre");
    expect(glass.macros.protein).toBeGreaterThan(0);
    expect(litre.macros.protein).toBeCloseTo(glass.macros.protein * 5, 4);
  });

  it("prefers the longer name when one food's name is inside another's", () => {
    expect(countItem("Milk powder 20g").food?.id).toBe("milk-powder");
    expect(countItem("Milk 200ml").food?.id).toBe("milk");
  });

  it("says what it could not count rather than counting it as zero", () => {
    const unknown = countItem("Grandmother's special halwa");
    expect(unknown.food).toBeNull();
    expect(unknown.problem).toBe("unknown food");

    const noAmount = countItem("Paneer");
    expect(noAmount.food?.id).toBe("paneer");
    expect(noAmount.problem).toBe("no amount");
    expect(noAmount.macros.kcal).toBe(0);
  });

  it("adds a whole meal up and names what it skipped", () => {
    const meal = countItems(["Paneer 100g", "Roti x2", "Mystery ladoo"]);
    expect(meal.uncounted).toEqual(["Mystery ladoo"]);
    const paneer = countItem("Paneer 100g").macros;
    const roti = countItem("Roti x2").macros;
    expect(meal.macros.protein).toBe(Math.round(paneer.protein + roti.protein));
    expect(meal.macros.kcal).toBe(Math.round(paneer.kcal + roti.kcal));
  });

  it("counts every item the plan generator writes, to the calorie", () => {
    // A generated plan has to read back, or it would look uncountable the
    // moment it is opened in the editor, and the numbers have to agree: the
    // generator and the counter both work from the same food library.
    const model = modelJson as unknown as PlanModel;
    const base: BuildInput = {
      weightKg: 95.5, heightCm: 175.5, age: 22, sex: "male", bodyFatPct: 35.3, days: 5, goal: "cut",
      experience: "intermediate", equipment: "full", conditions: [], injuries: [], restDays: ["sat", "sun"],
      gymStart: "19:00", gymEnd: "21:00", vegetarian: true, noEggs: true, noWhey: true,
    };

    for (const over of [{}, { vegetarian: false, noEggs: false, noWhey: false }, { noWhey: false }]) {
      const input = { ...base, ...over } as BuildInput;
      const plans = buildPlans(input, planTargets(input, model));
      if (!plans) throw new Error("no plans");
      for (const day of DAY_KEYS) {
        for (const meal of plans.diet.days?.[day] ?? []) {
          const counted = countItems(meal.items);
          expect(counted.uncounted).toEqual([]);
          expect(counted.macros.kcal).toBe(meal.kcal);
          expect(counted.macros.protein).toBe(meal.protein);
        }
      }
    }
  });
});
