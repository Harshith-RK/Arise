import type { Equipment, Experience, Injury } from "../rules";

/* ==========================================================================
   Exercise library.

   Each movement carries what selection needs and a name alone does not: the
   muscle it trains, the equipment it needs, how much skill it takes, which
   injuries it aggravates, and what to swap it for. The swaps become the
   variants a Hunter can switch to on the Quest screen.
   ========================================================================== */

/** Muscle groups the volume model prescribes, with arms split in two. */
export type Muscle = "chest" | "back" | "quads" | "hams" | "glutes" | "delts" | "biceps" | "triceps" | "calves";

/** For shoulders: presses and raises train different heads. */
export type DeltFocus = "press" | "side" | "rear";

export type Gear = "bodyweight" | "dumbbell" | "bench" | "barbell" | "rack" | "machine" | "pullupbar" | "cable" | "smith";

export type Exercise = {
  id: string;
  name: string;
  muscle: Muscle;
  /** Shown on the Quest row, e.g. "Upper Chest". */
  region: string;
  compound: boolean;
  gear: Gear[];
  /** 1 anyone, 2 some practice, 3 needs coaching or real strength. */
  skill: 1 | 2 | 3;
  avoid: Injury[];
  bodyweight: boolean;
  delt?: DeltFocus;
  /** Alternatives, in order. */
  swaps: string[];
};

/** Gear each equipment tier provides. */
export const GEAR_FOR: Record<Equipment, Set<Gear>> = {
  none: new Set(["bodyweight"]),
  dumbbell: new Set(["bodyweight", "dumbbell", "bench"]),
  gym: new Set(["bodyweight", "dumbbell", "bench", "barbell", "rack", "machine", "pullupbar"]),
  full: new Set(["bodyweight", "dumbbell", "bench", "barbell", "rack", "machine", "pullupbar", "cable", "smith"]),
};

export const MAX_SKILL: Record<Experience, number> = { beginner: 2, intermediate: 3, advanced: 3 };

type Row = [
  id: string,
  name: string,
  muscle: Muscle,
  region: string,
  compound: boolean,
  gear: Gear[],
  skill: 1 | 2 | 3,
  avoid: Injury[],
  swaps: string[],
  extra?: { bodyweight?: boolean; delt?: DeltFocus },
];

const BW = { bodyweight: true };

const ROWS: Row[] = [
  // ---- chest
  ["bb-bench", "Barbell Bench Press", "chest", "Chest", true, ["barbell", "bench", "rack"], 2, ["shoulder"], ["db-bench", "machine-press"]],
  ["db-bench", "Dumbbell Bench Press", "chest", "Chest", true, ["dumbbell", "bench"], 1, [], ["machine-press", "push-up"]],
  ["incline-db", "Incline Dumbbell Press", "chest", "Upper Chest", true, ["dumbbell", "bench"], 1, [], ["incline-smith", "incline-bb"]],
  ["incline-bb", "Incline Barbell Press", "chest", "Upper Chest", true, ["barbell", "bench", "rack"], 2, ["shoulder"], ["incline-db", "incline-smith"]],
  ["incline-smith", "Incline Smith Press", "chest", "Upper Chest", true, ["smith", "bench"], 1, [], ["incline-db"]],
  ["machine-press", "Machine Chest Press", "chest", "Chest", true, ["machine"], 1, [], ["db-bench"]],
  ["push-up", "Push Up", "chest", "Chest", true, ["bodyweight"], 1, [], ["decline-push-up"], BW],
  ["decline-push-up", "Feet-Elevated Push Up", "chest", "Upper Chest", true, ["bodyweight"], 2, ["shoulder"], ["push-up"], BW],
  ["db-fly", "Dumbbell Fly", "chest", "Chest", false, ["dumbbell", "bench"], 1, ["shoulder"], ["cable-fly", "pec-deck"]],
  ["cable-fly", "Cable Fly", "chest", "Chest", false, ["cable"], 1, [], ["pec-deck", "db-fly"]],
  ["pec-deck", "Pec Deck", "chest", "Chest", false, ["machine"], 1, [], ["cable-fly", "db-fly"]],

  // ---- back
  ["pull-up", "Pull Up", "back", "Lats", true, ["pullupbar"], 3, [], ["chin-up", "lat-pulldown"], BW],
  ["chin-up", "Chin Up", "back", "Lats", true, ["pullupbar"], 2, ["elbow"], ["pull-up", "lat-pulldown"], BW],
  ["lat-pulldown", "Lat Pulldown", "back", "Lats", true, ["machine"], 1, [], ["pull-up", "straight-arm"]],
  ["bb-row", "Barbell Row", "back", "Mid Back", true, ["barbell"], 2, ["lower_back"], ["chest-row", "db-row"]],
  ["db-row", "One-Arm Dumbbell Row", "back", "Mid Back", true, ["dumbbell", "bench"], 1, [], ["chest-row", "cable-row"]],
  ["chest-row", "Chest-Supported Dumbbell Row", "back", "Mid Back", true, ["dumbbell", "bench"], 1, [], ["db-row", "cable-row"]],
  ["cable-row", "Seated Cable Row", "back", "Mid Back", true, ["cable"], 1, [], ["chest-row"]],
  ["tbar-row", "T-Bar Row", "back", "Mid Back", true, ["barbell"], 2, ["lower_back"], ["chest-row", "cable-row"]],
  ["inverted-row", "Inverted Row", "back", "Mid Back", true, ["bodyweight"], 1, [], ["superman"], BW],
  ["straight-arm", "Straight-Arm Pulldown", "back", "Lats", false, ["cable"], 1, [], ["lat-pulldown"]],
  ["deadlift", "Deadlift", "back", "Lower Back", true, ["barbell"], 3, ["lower_back", "knee"], ["rdl", "back-extension"]],
  ["back-extension", "Back Extension", "back", "Lower Back", false, ["machine"], 1, ["lower_back"], ["superman"]],
  ["superman", "Superman Hold", "back", "Lower Back", false, ["bodyweight"], 1, [], ["inverted-row"], BW],

  // ---- shoulders
  ["ohp", "Overhead Press", "delts", "Front Delts", true, ["barbell", "rack"], 2, ["shoulder", "lower_back"], ["db-shoulder-press", "machine-shoulder"], { delt: "press" }],
  ["db-shoulder-press", "Seated Dumbbell Press", "delts", "Front Delts", true, ["dumbbell", "bench"], 1, ["shoulder"], ["machine-shoulder", "ohp"], { delt: "press" }],
  ["machine-shoulder", "Machine Shoulder Press", "delts", "Front Delts", true, ["machine"], 1, ["shoulder"], ["db-shoulder-press"], { delt: "press" }],
  ["pike-push-up", "Pike Push Up", "delts", "Front Delts", true, ["bodyweight"], 2, ["shoulder"], ["push-up"], { delt: "press", bodyweight: true }],
  ["lateral-raise", "Dumbbell Lateral Raise", "delts", "Side Delts", false, ["dumbbell"], 1, [], ["cable-lateral"], { delt: "side" }],
  ["cable-lateral", "Cable Lateral Raise", "delts", "Side Delts", false, ["cable"], 1, [], ["lateral-raise"], { delt: "side" }],
  ["upright-row", "Upright Row", "delts", "Side Delts", true, ["barbell"], 2, ["shoulder"], ["lateral-raise"], { delt: "side" }],
  ["rear-fly", "Rear Delt Fly", "delts", "Rear Delts", false, ["dumbbell"], 1, [], ["face-pull", "reverse-pec"], { delt: "rear" }],
  ["face-pull", "Face Pull", "delts", "Rear Delts", false, ["cable"], 1, [], ["rear-fly"], { delt: "rear" }],
  ["reverse-pec", "Reverse Pec Deck", "delts", "Rear Delts", false, ["machine"], 1, [], ["rear-fly"], { delt: "rear" }],
  ["ytw", "Prone Y-T-W Raise", "delts", "Rear Delts", false, ["bodyweight"], 1, [], ["rear-fly"], { delt: "rear", bodyweight: true }],
  ["side-plank-raise", "Side-Lying Arm Raise", "delts", "Side Delts", false, ["bodyweight"], 1, [], ["lateral-raise"], { delt: "side", bodyweight: true }],

  // ---- biceps
  ["bb-curl", "Barbell Curl", "biceps", "Biceps", false, ["barbell"], 1, ["elbow"], ["db-curl", "cable-curl"]],
  ["db-curl", "Alternate Dumbbell Curl", "biceps", "Biceps", false, ["dumbbell"], 1, [], ["hammer-curl", "cable-curl"]],
  ["hammer-curl", "Hammer Curl", "biceps", "Brachialis", false, ["dumbbell"], 1, [], ["db-curl"]],
  ["incline-curl", "Incline Dumbbell Curl", "biceps", "Biceps", false, ["dumbbell", "bench"], 1, ["shoulder"], ["db-curl"]],
  ["preacher-curl", "Preacher Curl", "biceps", "Biceps", false, ["machine"], 1, ["elbow"], ["cable-curl", "db-curl"]],
  ["cable-curl", "Cable Curl", "biceps", "Biceps", false, ["cable"], 1, [], ["db-curl"]],
  ["supinated-row", "Underhand Inverted Row", "biceps", "Biceps", true, ["bodyweight"], 1, ["elbow"], ["inverted-row"], BW],

  // ---- triceps
  ["rope-pushdown", "Rope Pushdown", "triceps", "Triceps", false, ["cable"], 1, [], ["oh-extension", "kickback"]],
  ["skull-crusher", "Skull Crusher", "triceps", "Triceps", false, ["barbell", "bench"], 2, ["elbow"], ["rope-pushdown", "oh-extension"]],
  ["oh-extension", "Overhead Dumbbell Extension", "triceps", "Triceps", false, ["dumbbell"], 1, ["elbow", "shoulder"], ["kickback", "rope-pushdown"]],
  ["close-grip-bench", "Close-Grip Bench Press", "triceps", "Triceps", true, ["barbell", "bench", "rack"], 2, ["shoulder"], ["machine-dip", "db-bench"]],
  ["kickback", "Dumbbell Kickback", "triceps", "Triceps", false, ["dumbbell"], 1, [], ["rope-pushdown"]],
  ["machine-dip", "Machine Dip", "triceps", "Triceps", true, ["machine"], 1, ["shoulder"], ["rope-pushdown"]],
  ["bench-dip", "Bench Dip", "triceps", "Triceps", true, ["bodyweight"], 1, ["shoulder"], ["diamond-push-up"], BW],
  ["diamond-push-up", "Diamond Push Up", "triceps", "Triceps", true, ["bodyweight"], 2, ["elbow"], ["bench-dip"], BW],

  // ---- quads
  ["back-squat", "Back Squat", "quads", "Quads", true, ["barbell", "rack"], 2, ["knee", "lower_back"], ["leg-press", "goblet-squat"]],
  ["goblet-squat", "Goblet Squat", "quads", "Quads", true, ["dumbbell"], 1, ["knee"], ["leg-press", "bw-squat"]],
  ["leg-press", "Leg Press", "quads", "Quads", true, ["machine"], 1, [], ["hack-squat", "goblet-squat"]],
  ["hack-squat", "Hack Squat", "quads", "Quads", true, ["machine"], 2, ["knee"], ["leg-press"]],
  ["smith-squat", "Smith Machine Squat", "quads", "Quads", true, ["smith"], 1, ["knee"], ["leg-press"]],
  ["bulgarian", "Bulgarian Split Squat", "quads", "Quads", true, ["dumbbell", "bench"], 2, ["knee"], ["lunge", "step-up"]],
  ["lunge", "Walking Lunge", "quads", "Quads", true, ["dumbbell"], 1, ["knee"], ["step-up", "bulgarian"]],
  ["step-up", "Dumbbell Step Up", "quads", "Quads", true, ["dumbbell", "bench"], 1, [], ["lunge"]],
  ["bw-squat", "Bodyweight Squat", "quads", "Quads", true, ["bodyweight"], 1, [], ["split-squat"], BW],
  ["split-squat", "Split Squat", "quads", "Quads", true, ["bodyweight"], 1, ["knee"], ["bw-squat"], BW],
  ["wall-sit", "Wall Sit", "quads", "Quads", false, ["bodyweight"], 1, [], ["bw-squat"], BW],
  ["leg-extension", "Leg Extension", "quads", "Quads", false, ["machine"], 1, ["knee"], ["leg-press"]],

  // ---- hamstrings
  ["rdl", "Romanian Deadlift", "hams", "Hamstrings", true, ["barbell"], 2, ["lower_back"], ["db-rdl", "lying-leg-curl"]],
  ["db-rdl", "Dumbbell Romanian Deadlift", "hams", "Hamstrings", true, ["dumbbell"], 1, ["lower_back"], ["lying-leg-curl"]],
  ["lying-leg-curl", "Lying Leg Curl", "hams", "Hamstrings", false, ["machine"], 1, [], ["seated-leg-curl"]],
  ["seated-leg-curl", "Seated Leg Curl", "hams", "Hamstrings", false, ["machine"], 1, [], ["lying-leg-curl"]],
  ["nordic", "Nordic Curl", "hams", "Hamstrings", false, ["bodyweight"], 3, ["knee"], ["bridge-curl"], BW],
  ["bridge-curl", "Towel Leg Curl", "hams", "Hamstrings", false, ["bodyweight"], 2, [], ["sl-hinge"], BW],
  ["sl-hinge", "Single-Leg Hip Hinge", "hams", "Hamstrings", true, ["bodyweight"], 1, [], ["bridge-curl"], BW],

  // ---- glutes
  ["hip-thrust", "Barbell Hip Thrust", "glutes", "Glutes", true, ["barbell", "bench"], 1, [], ["db-hip-thrust", "glute-bridge"]],
  ["db-hip-thrust", "Dumbbell Hip Thrust", "glutes", "Glutes", true, ["dumbbell", "bench"], 1, [], ["glute-bridge"]],
  ["glute-bridge", "Glute Bridge", "glutes", "Glutes", true, ["bodyweight"], 1, [], ["sl-bridge"], BW],
  ["sl-bridge", "Single-Leg Glute Bridge", "glutes", "Glutes", false, ["bodyweight"], 2, [], ["glute-bridge"], BW],
  ["cable-kickback", "Cable Glute Kickback", "glutes", "Glutes", false, ["cable"], 1, [], ["hip-abduction"]],
  ["hip-abduction", "Hip Abduction Machine", "glutes", "Glutes", false, ["machine"], 1, [], ["cable-kickback"]],

  // ---- calves
  ["standing-calf", "Standing Calf Raise", "calves", "Calves", false, ["machine"], 1, [], ["seated-calf", "db-calf"]],
  ["seated-calf", "Seated Calf Raise", "calves", "Calves", false, ["machine"], 1, [], ["standing-calf"]],
  ["db-calf", "Dumbbell Calf Raise", "calves", "Calves", false, ["dumbbell"], 1, [], ["sl-calf"]],
  ["sl-calf", "Single-Leg Calf Raise", "calves", "Calves", false, ["bodyweight"], 1, [], ["db-calf"], BW],
];

export const EXERCISES: Exercise[] = ROWS.map(([id, name, muscle, region, compound, gear, skill, avoid, swaps, extra]) => ({
  id,
  name,
  muscle,
  region,
  compound,
  gear,
  skill,
  avoid,
  swaps,
  bodyweight: extra?.bodyweight ?? false,
  delt: extra?.delt,
}));

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export type TrainingPrefs = { equipment: Equipment; experience: Experience; injuries: readonly string[] };

/** Whether a Hunter can do this movement with what they have and what hurts. */
export function usable(ex: Exercise, prefs: TrainingPrefs): boolean {
  const gear = GEAR_FOR[prefs.equipment];
  if (!ex.gear.every((g) => gear.has(g))) return false;
  if (ex.skill > MAX_SKILL[prefs.experience]) return false;
  if (ex.avoid.some((i) => prefs.injuries.includes(i))) return false;
  return true;
}
