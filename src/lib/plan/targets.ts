import { runClassifier, runRegressor, type PlanModel } from "./model";
import {
  body,
  formulaSession,
  formulaTargets,
  KCAL_FLOOR,
  KCAL_PER_KG_FAT,
  MAX_WEEKLY_GAIN_FRACTION,
  MAX_WEEKLY_LOSS_FRACTION,
  MODIFY_CONDITIONS,
  REFUSE_CONDITIONS,
  REPS,
  tdeeFor,
  type SessionInput,
  type TargetInput,
} from "./rules";

/* ==========================================================================
   Plan targets: the model, inside a cage.

   The model is trusted only where it was measured to be trustworthy:
     - in range, it reproduces the formulas to within ~6 kcal (body fat known)
       or ~20 kcal (unknown). Out of range it was off by 259 to 313 kcal with
       no signal that it was guessing, so out of range gets the formula.
     - the safety clamps are code. The bare model put 2.57% of predictions
       under the calorie floor; after these clamps, zero across every row.
     - carbs are derived from the other three, so macros always add up to the
       calories, which the independent model heads did not guarantee.
   ========================================================================== */

export type PlanRefusal = { refused: true; reason: string };

export type PlanTargets = {
  refused: false;
  /** "model" when the trained model produced the numbers, "formula" otherwise. */
  source: "model" | "formula";
  /** Why the formula was used instead, when it was. */
  fallbackReason: string | null;
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  deficit: number;
  weeklyKgChange: number;
  bodyFatPct: number;
  bodyFatEstimated: boolean;
  clamped: string[];
  split: string;
  weeklySets: Record<string, number>;
  repRange: [number, number];
  cardioSessions: number;
};

const REFUSAL_COPY: Record<string, string> = {
  under_18: "The System does not set calorie targets for anyone under 18. A doctor or registered dietitian should.",
  pregnancy: "Pregnancy needs a plan from your doctor or midwife, not a deficit from an app.",
  breastfeeding: "Breastfeeding raises energy needs in ways this cannot account for. Ask your doctor or a dietitian.",
  ckd: "Kidney disease changes protein needs in the opposite direction to this plan. Your nephrologist or dietitian should set it.",
  type1_diabetes: "Type 1 diabetes needs meals planned around insulin. Your diabetes care team should set these targets.",
  eating_disorder_history: "A calorie target is not a safe starting point here. Please work with a clinician on nutrition.",
  cancer_treatment: "Treatment changes energy and protein needs in ways this cannot see. Your oncology team should guide it.",
};

/** A reason no plan should be generated, or null. */
export function refusalFor(age: number, conditions: readonly string[]): PlanRefusal | null {
  if (age < 18) return { refused: true, reason: REFUSAL_COPY.under_18 };
  for (const c of REFUSE_CONDITIONS) {
    if (conditions.includes(c)) return { refused: true, reason: REFUSAL_COPY[c] };
  }
  return null;
}

const within = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;

/** The model's feature vector, or the reason this profile is out of its range. */
function features(model: PlanModel, input: TargetInput, leanKg: number):
  | { path: "katch" | "mifflin"; x: number[] }
  | { outOfRange: string } {
  const { encodings, ranges } = model;
  const flags = encodings.flags.map((f) => ((input.conditions ?? []).includes(f) ? 1 : 0));
  const female = input.sex === "female" ? 1 : 0;
  const goal = encodings.goal[input.goal];

  if (input.bodyFatPct !== null) {
    const k = ranges.katch;
    if (!within(leanKg, k.lean_kg)) return { outOfRange: "lean mass outside the trained range" };
    if (!within(input.weightKg, k.weight_kg)) return { outOfRange: "weight outside the trained range" };
    if (!within(input.bodyFatPct, k.bodyfat_pct[input.sex])) return { outOfRange: "body fat outside the trained range" };
    if (!within(input.days, k.days)) return { outOfRange: "training days outside the trained range" };
    return { path: "katch", x: [female, leanKg, input.bodyFatPct, input.weightKg, input.days, goal, ...flags] };
  }

  const m = ranges.mifflin;
  const bmi = input.weightKg / (input.heightCm / 100) ** 2;
  if (!within(input.heightCm, m.height_cm)) return { outOfRange: "height outside the trained range" };
  if (!within(input.weightKg, m.weight_kg)) return { outOfRange: "weight outside the trained range" };
  if (!within(input.age, m.age)) return { outOfRange: "age outside the trained range" };
  if (!within(bmi, m.bmi)) return { outOfRange: "BMI outside the trained range" };
  if (!within(input.days, m.days)) return { outOfRange: "training days outside the trained range" };
  return { path: "mifflin", x: [female, input.heightCm, input.weightKg, input.age, input.days, goal, ...flags] };
}

/**
 * The same clamps the formula applies, run over the model's output. Mirrors
 * `guard` in ml/export.py, which is where the zero-breaks figure comes from.
 */
export function guard(
  pred: { kcal: number; proteinG: number; fatG: number },
  ctx: { weightKg: number; leanKg: number; sex: TargetInput["sex"]; goal: TargetInput["goal"]; bmr: number; tdee: number },
): { kcal: number; proteinG: number; fatG: number; carbsG: number; clamped: string[] } {
  const { weightKg, leanKg, sex, goal, bmr, tdee } = ctx;
  const clamped: string[] = [];
  let kcal = pred.kcal;

  if (goal === "cut") {
    const lower = Math.max(bmr, Math.min(KCAL_FLOOR[sex], tdee));
    if (kcal < lower) {
      kcal = lower;
      clamped.push("floor");
    }
    if (kcal > tdee) {
      kcal = tdee;
      clamped.push("maintenance");
    }
  }
  const loss = ((tdee - kcal) * 7) / KCAL_PER_KG_FAT;
  if (loss > weightKg * MAX_WEEKLY_LOSS_FRACTION) {
    kcal = tdee - (weightKg * MAX_WEEKLY_LOSS_FRACTION * KCAL_PER_KG_FAT) / 7;
    clamped.push("loss_rate");
  } else if (-loss > weightKg * MAX_WEEKLY_GAIN_FRACTION) {
    kcal = tdee + (weightKg * MAX_WEEKLY_GAIN_FRACTION * KCAL_PER_KG_FAT) / 7;
    clamped.push("gain_rate");
  }

  let proteinG = Math.max(0, pred.proteinG);
  let fatG = Math.max(0, pred.fatG);
  let carbsG = (kcal - proteinG * 4 - fatG * 9) / 4;
  if (carbsG < 0) {
    fatG = Math.max(0.5 * weightKg, (kcal - proteinG * 4) / 9);
    carbsG = (kcal - proteinG * 4 - fatG * 9) / 4;
    clamped.push("fat_squeeze");
  }
  if (carbsG < 0) {
    proteinG = Math.max(1.2 * leanKg, (kcal - fatG * 9) / 4);
    carbsG = Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4);
    clamped.push("protein_squeeze");
  }
  return { kcal, proteinG, fatG, carbsG, clamped };
}

export type PlanInput = TargetInput & Omit<SessionInput, "days" | "goal">;

/**
 * Profile in, full prescription out. Pass `model` as null to force the formula
 * (no network, the chunk failed to load, or a test wants the baseline).
 */
export function planTargets(input: PlanInput, model: PlanModel | null): PlanTargets | PlanRefusal {
  const refusal = refusalFor(input.age, input.conditions ?? []);
  if (refusal) return refusal;

  const conditions = (input.conditions ?? []).filter((c) => (MODIFY_CONDITIONS as readonly string[]).includes(c));
  const clean = { ...input, conditions };
  const formula = formulaTargets(clean);
  const { bmr, leanKg, bodyFatPct } = body(clean);
  const tdee = tdeeFor(bmr, clean.days, conditions);

  const [repLow, repHigh] = REPS[clean.goal];
  const sessionInput: SessionInput = {
    days: clean.days,
    experience: clean.experience,
    equipment: clean.equipment,
    goal: clean.goal,
    injuries: clean.injuries,
  };

  const base = {
    refused: false as const,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    bodyFatPct: Math.round(bodyFatPct * 10) / 10,
    bodyFatEstimated: clean.bodyFatPct === null,
    repRange: [repLow, repHigh] as [number, number],
    cardioSessions: Math.max(2, Math.min(6, clean.days)),
  };

  const fallback = (reason: string | null): PlanTargets => {
    const s = formulaSession(sessionInput);
    return {
      ...base,
      source: "formula",
      fallbackReason: reason,
      kcal: Math.round(formula.kcal),
      proteinG: Math.round(formula.proteinG),
      carbsG: Math.round(formula.carbsG),
      fatG: Math.round(formula.fatG),
      deficit: Math.round(formula.deficit),
      weeklyKgChange: formula.weeklyKgChange,
      clamped: formula.clamped,
      split: s.split,
      weeklySets: s.weeklySets,
    };
  };

  if (!model) return fallback("model unavailable");
  const f = features(model, clean, leanKg);
  if ("outOfRange" in f) return fallback(f.outOfRange);

  const heads = model[f.path];
  const g = guard(
    { kcal: runRegressor(heads.kcal, f.x), proteinG: runRegressor(heads.protein_g, f.x), fatG: runRegressor(heads.fat_g, f.x) },
    { weightKg: clean.weightKg, leanKg, sex: clean.sex, goal: clean.goal, bmr, tdee },
  );

  const enc = model.encodings;
  const sx = [
    clean.days,
    enc.experience[clean.experience],
    enc.equipment[clean.equipment],
    enc.goal[clean.goal],
    ...enc.injuries.map((i) => ((clean.injuries ?? []).includes(i) ? 1 : 0)),
  ];
  const weeklySets: Record<string, number> = {};
  for (const m of enc.muscles) weeklySets[m] = Math.max(0, Math.round(runRegressor(model.session.volume[m], sx)));

  const kcal = Math.round(g.kcal);
  const deficit = Math.round(tdee - g.kcal);
  return {
    ...base,
    source: "model",
    fallbackReason: null,
    kcal,
    proteinG: Math.round(g.proteinG),
    fatG: Math.round(g.fatG),
    // Recomputed from the whole-number values, so the three macros add up exactly.
    carbsG: Math.max(0, Math.round((kcal - Math.round(g.proteinG) * 4 - Math.round(g.fatG) * 9) / 4)),
    deficit,
    weeklyKgChange: Math.round(((deficit * 7) / KCAL_PER_KG_FAT) * 100) / 100,
    clamped: g.clamped,
    split: runClassifier(model.session.split, sx),
    weeklySets,
  };
}
