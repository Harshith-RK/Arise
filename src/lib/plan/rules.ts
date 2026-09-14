/* ==========================================================================
   Plan rules: the published formulas the model was trained on.

   A line-for-line port of ml/rules.py, tested against it (parity.json). The
   app needs these even with a model in front of them, for three reasons:

     - BMR and TDEE feed the safety clamps, which are code, never the model
     - anyone outside the range the model was trained on gets these instead,
       because out of range the model is off by ~300 kcal and cannot say so
     - the training split's rep ranges and cardio are rules, not predictions
   ========================================================================== */

export type Sex = "male" | "female";
export type Goal = "cut" | "maintain" | "bulk";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "none" | "dumbbell" | "gym" | "full";

/** Conditions that change the numbers. Fed to the model. */
export const MODIFY_CONDITIONS = ["hypothyroid", "pcos", "insulin_resistance", "hypertension"] as const;
/** Conditions that must not receive a generated plan at all. */
export const REFUSE_CONDITIONS = [
  "pregnancy",
  "breastfeeding",
  "ckd",
  "type1_diabetes",
  "eating_disorder_history",
  "cancer_treatment",
] as const;
export const CONDITIONS = [...MODIFY_CONDITIONS, ...REFUSE_CONDITIONS] as const;
export type Condition = (typeof CONDITIONS)[number];

export const INJURIES = ["knee", "shoulder", "lower_back", "elbow"] as const;
export type Injury = (typeof INJURIES)[number];

export const KCAL_PER_KG_FAT = 7700;
export const ACTIVITY: Record<number, number> = { 0: 1.2, 1: 1.2, 2: 1.375, 3: 1.375, 4: 1.55, 5: 1.55, 6: 1.725, 7: 1.725 };
const CUT_BANDS: Record<Sex, [number, number][]> = {
  male: [[30, 0.25], [20, 0.2], [12, 0.15], [0, 0.1]],
  female: [[38, 0.25], [28, 0.2], [20, 0.15], [0, 0.1]],
};
const BULK_BANDS: Record<Sex, [number, number][]> = {
  male: [[20, 0.05], [15, 0.1], [0, 0.15]],
  female: [[30, 0.05], [25, 0.1], [0, 0.15]],
};
export const KCAL_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };
export const MAX_WEEKLY_LOSS_FRACTION = 0.01;
export const MAX_WEEKLY_GAIN_FRACTION = 0.005;
const PROTEIN_G_PER_KG_LEAN: Record<Goal, number> = { cut: 2.2, maintain: 2.0, bulk: 1.8 };
const FAT_G_PER_KG_BODY_MIN = 0.8;

const TDEE_SCALE: Partial<Record<Condition, number>> = { hypothyroid: 0.9 };
const CARB_SHIFT: Partial<Record<Condition, number>> = { pcos: -0.15, insulin_resistance: -0.1 };
/** Not a calorie change: a ceiling the food selector must respect. */
export const SODIUM_MG_MAX: Partial<Record<Condition, number>> = { hypertension: 1500 };

export const VOLUME: Record<Experience, Record<string, number>> = {
  beginner: { chest: 8, back: 10, quads: 8, hams: 6, glutes: 8, delts: 8, arms: 6, calves: 6 },
  intermediate: { chest: 12, back: 14, quads: 12, hams: 9, glutes: 10, delts: 12, arms: 10, calves: 8 },
  advanced: { chest: 16, back: 18, quads: 16, hams: 12, glutes: 12, delts: 16, arms: 14, calves: 10 },
};
export const MUSCLES = Object.keys(VOLUME.beginner);
export const REPS: Record<Goal, [number, number]> = { cut: [8, 12], maintain: [6, 12], bulk: [6, 10] };

export const SPLIT_LABEL: Record<string, string> = {
  full_body_x2: "Full body, twice a week",
  full_body_x3: "Full body, three times a week",
  upper_lower_x2: "Upper and lower, twice each",
  ppl_upper_lower: "Push, pull, legs, upper, lower",
  ppl_x2: "Push, pull, legs, twice through",
};

/* ---------------------------------------------------------------- body */

export const katchMcArdleBmr = (leanKg: number) => 370 + 21.6 * leanKg;

export function mifflinBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Rough body fat from BMI, used only to pick a deficit band. */
export const deurenbergBodyFat = (bmi: number, age: number, sex: Sex) =>
  1.2 * bmi + 0.23 * age - 10.8 * (sex === "male" ? 1 : 0) - 5.4;

function band(value: number, bands: [number, number][]): number {
  for (const [threshold, frac] of bands) if (value >= threshold) return frac;
  return bands[bands.length - 1][1];
}

/** Round the way Python's round() does for these magnitudes. */
const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/* ---------------------------------------------------------------- targets */

export type TargetInput = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  bodyFatPct: number | null;
  days: number;
  goal: Goal;
  conditions?: readonly string[];
};

export type Targets = {
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  deficit: number;
  weeklyKgChange: number;
  clamped: string[];
  leanKg: number;
  bodyFatPct: number;
};

/** BMR, lean mass and the body fat used for banding, for either path. */
export function body(input: TargetInput): { bmr: number; leanKg: number; bodyFatPct: number } {
  const { weightKg, heightCm, age, sex, bodyFatPct } = input;
  if (bodyFatPct !== null) {
    const leanKg = weightKg * (1 - bodyFatPct / 100);
    return { bmr: katchMcArdleBmr(leanKg), leanKg, bodyFatPct };
  }
  const bmi = weightKg / (heightCm / 100) ** 2;
  const bf = Math.max(3, Math.min(65, deurenbergBodyFat(bmi, age, sex)));
  return { bmr: mifflinBmr(weightKg, heightCm, age, sex), leanKg: weightKg * (1 - bf / 100), bodyFatPct: bf };
}

export function tdeeFor(bmr: number, days: number, conditions: readonly string[] = []): number {
  let tdee = bmr * ACTIVITY[Math.max(0, Math.min(7, days))];
  for (const c of conditions) tdee *= TDEE_SCALE[c as Condition] ?? 1;
  return tdee;
}

/** Profile in, daily numbers out, entirely by formula. Mirrors rules.targets. */
export function formulaTargets(input: TargetInput): Targets {
  const { weightKg, sex, days, goal } = input;
  const conditions = input.conditions ?? [];
  const { bmr, leanKg, bodyFatPct } = body(input);
  const tdee = tdeeFor(bmr, days, conditions);

  let kcal =
    goal === "cut"
      ? tdee * (1 - band(bodyFatPct, CUT_BANDS[sex]))
      : goal === "bulk"
        ? tdee * (1 + band(bodyFatPct, BULK_BANDS[sex]))
        : tdee;

  const clamped: string[] = [];
  if (goal === "cut") {
    if (kcal < bmr) {
      kcal = bmr;
      clamped.push("bmr");
    }
    const floor = Math.min(KCAL_FLOOR[sex], tdee);
    if (kcal < floor) {
      kcal = floor;
      clamped.push("floor");
    }
    if (kcal > tdee) {
      kcal = tdee;
      clamped.push("maintenance");
    }
  }

  let weekly = ((tdee - kcal) * 7) / KCAL_PER_KG_FAT;
  if (weekly > weightKg * MAX_WEEKLY_LOSS_FRACTION) {
    kcal = tdee - (weightKg * MAX_WEEKLY_LOSS_FRACTION * KCAL_PER_KG_FAT) / 7;
    clamped.push("loss_rate");
  } else if (-weekly > weightKg * MAX_WEEKLY_GAIN_FRACTION) {
    kcal = tdee + (weightKg * MAX_WEEKLY_GAIN_FRACTION * KCAL_PER_KG_FAT) / 7;
    clamped.push("gain_rate");
  }
  const deficit = tdee - kcal;
  weekly = (deficit * 7) / KCAL_PER_KG_FAT;

  let protein = PROTEIN_G_PER_KG_LEAN[goal] * leanKg;
  let fat = FAT_G_PER_KG_BODY_MIN * weightKg;
  let carbKcal = kcal - protein * 4 - fat * 9;

  const shift = conditions.reduce((s, c) => s + (CARB_SHIFT[c as Condition] ?? 0), 0);
  if (shift && carbKcal > 0) {
    const moved = carbKcal * -shift;
    carbKcal -= moved;
    fat += moved / 9;
  }
  if (carbKcal < 0) {
    fat = Math.max(0.5 * weightKg, (kcal - protein * 4) / 9);
    carbKcal = kcal - protein * 4 - fat * 9;
    clamped.push("fat_squeeze");
  }
  if (carbKcal < 0) {
    protein = Math.max(1.2 * leanKg, (kcal - fat * 9) / 4);
    carbKcal = Math.max(0, kcal - protein * 4 - fat * 9);
    clamped.push("protein_squeeze");
  }

  return {
    bmr: r(bmr, 1),
    tdee: r(tdee, 1),
    kcal: r(kcal, 1),
    proteinG: r(protein, 1),
    carbsG: r(carbKcal / 4, 1),
    fatG: r(fat, 1),
    deficit: r(deficit, 1),
    weeklyKgChange: r(weekly, 4),
    clamped,
    leanKg,
    bodyFatPct,
  };
}

/* ---------------------------------------------------------------- training */

export type SessionInput = {
  days: number;
  experience: Experience;
  equipment: Equipment;
  goal: Goal;
  injuries?: readonly string[];
};

const SPLITS: Record<number, string> = {
  2: "full_body_x2",
  3: "full_body_x3",
  4: "upper_lower_x2",
  5: "ppl_upper_lower",
  6: "ppl_x2",
};
const GOAL_VOLUME_SCALE: Record<Goal, number> = { cut: 0.85, maintain: 1, bulk: 1.1 };

/** Formula version of the training prescription. Mirrors rules.session. */
export function formulaSession(input: SessionInput): { split: string; weeklySets: Record<string, number> } {
  const days = Math.max(2, Math.min(6, input.days));
  const injuries = new Set(input.injuries ?? []);
  const equipScale = input.equipment === "none" ? 0.75 : input.equipment === "dumbbell" ? 0.9 : 1;
  const weeklySets: Record<string, number> = {};
  for (const [m, base] of Object.entries(VOLUME[input.experience])) {
    let v = base * GOAL_VOLUME_SCALE[input.goal] * equipScale;
    if (
      (injuries.has("knee") && ["quads", "hams", "glutes"].includes(m)) ||
      (injuries.has("shoulder") && ["chest", "delts"].includes(m)) ||
      (injuries.has("lower_back") && ["back", "hams", "glutes"].includes(m)) ||
      (injuries.has("elbow") && m === "arms")
    ) {
      v *= 0.5;
    }
    weeklySets[m] = pyRound(v);
  }
  return { split: SPLITS[days], weeklySets };
}

/** Python's round(): halves go to the even neighbour. */
export function pyRound(v: number): number {
  const f = Math.floor(v);
  const diff = v - f;
  if (Math.abs(diff - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(v);
}
