import { z } from "zod";

/* ==========================================================================
   Domain schemas. Plans (templates) are versioned and kept apart from logs
   (what actually happened on a date). Logs reference plan versions and
   stable IDs, never names, so renames and swaps keep history intact.
   ========================================================================== */

export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DayKeySchema = z.enum(DAY_KEYS);
export type DayKey = z.infer<typeof DayKeySchema>;

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const TimeKey = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM");

/* ---------- Workout plan ---------- */

export const VariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  repsMin: z.number().int().min(1).max(100),
  repsMax: z.number().int().min(1).max(100),
});
export type Variant = z.infer<typeof VariantSchema>;

export const ExerciseDefSchema = z.object({
  id: z.string().min(1),
  muscleRegion: z.string().min(1).max(40),
  targetSets: z.number().int().min(1).max(10),
  /** variants[0] is the default movement. */
  variants: z.array(VariantSchema).min(1).max(4),
  bodyweight: z.boolean().default(false),
});
export type ExerciseDef = z.infer<typeof ExerciseDefSchema>;

export const TrainingDaySchema = z.object({
  title: z.string().min(1).max(40),
  exerciseIds: z.array(z.string()),
});
export type TrainingDay = z.infer<typeof TrainingDaySchema>;

export const WorkoutPlanSchema = z.object({
  version: z.number().int().min(1),
  createdAt: z.string(),
  days: z.record(DayKeySchema, TrainingDaySchema),
  exercises: z.record(z.string(), ExerciseDefSchema),
});
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

/* ---------- Diet plan ---------- */

export const MacrosSchema = z.object({
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(2000),
  fat: z.number().min(0).max(1000),
  kcal: z.number().min(0).max(10000),
});
export type Macros = z.infer<typeof MacrosSchema>;

export const MealDefSchema = MacrosSchema.extend({
  id: z.string().min(1),
  time: TimeKey,
  name: z.string().min(1).max(80),
  items: z.array(z.string().min(1).max(80)).min(1).max(12),
  group: z.string().max(40).nullable().default(null),
});
export type MealDef = z.infer<typeof MealDefSchema>;

export const DietPlanSchema = z.object({
  version: z.number().int().min(1),
  createdAt: z.string(),
  /** The default day. Every weekday without its own list eats this. */
  meals: z.array(MealDefSchema).min(1).max(12),
  /**
   * Optional meals per weekday, so the week is not one day on repeat. Absent on
   * every plan made before it existed, which is why `meals` stays the fallback
   * rather than being replaced.
   */
  days: z.partialRecord(DayKeySchema, z.array(MealDefSchema).min(1).max(12)).optional(),
});
export type DietPlan = z.infer<typeof DietPlanSchema>;

/* ---------- Logs ---------- */

export const SetLogSchema = z.object({
  done: z.boolean(),
  weight: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(200).nullable(),
});
export type SetLog = z.infer<typeof SetLogSchema>;

export const ExerciseLogSchema = z.object({
  variantId: z.string(),
  sets: z.array(SetLogSchema).max(10),
});
export type ExerciseLog = z.infer<typeof ExerciseLogSchema>;

export const MealLogSchema = z.object({
  eaten: z.boolean(),
  override: MacrosSchema.nullable(),
});
export type MealLog = z.infer<typeof MealLogSchema>;

export const DayLogSchema = z.object({
  date: DateKey,
  workoutPlanVersion: z.number().int().min(1),
  dietPlanVersion: z.number().int().min(1),
  exercises: z.record(z.string(), ExerciseLogSchema),
  meals: z.record(z.string(), MealLogSchema),
  cardio: z.object({
    done: z.boolean(),
    kcal: z.number().min(0).max(3000),
    minutes: z.number().min(0).max(600).nullable(),
  }),
  bonus: z.object({ done: z.boolean() }),
  sleep: z
    .object({
      hours: z.number().min(0).max(24).nullable(),
      waterL: z.number().min(0).max(20).nullable(),
    })
    .nullable(),
  updatedAt: z.string(),
});
export type DayLog = z.infer<typeof DayLogSchema>;

export const WeighInSchema = z.object({
  date: DateKey,
  weightKg: z.number().min(20).max(400),
  bodyFatPct: z.number().min(2).max(75).nullable(),
  muscleKg: z.number().min(5).max(150).nullable(),
  visceral: z.number().int().min(1).max(59).nullable(),
});
export type WeighIn = z.infer<typeof WeighInSchema>;

/* ---------- Profile, settings, supplies ---------- */

export const ProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40),
  heightCm: z.number().min(100, "Too short").max(250, "Too tall"),
  startWeightKg: z.number().min(30).max(400),
  targetWeightKg: z.number().min(30).max(400),
  phase1TargetKg: z.number().min(30).max(400),
  bodyFatPct: z.number().min(2).max(75).nullable(),
  muscleKg: z.number().min(5).max(150).nullable(),
  visceral: z.number().int().min(1).max(59).nullable(),
  bmr: z.number().int().min(800).max(5000),
  gymStart: TimeKey,
  gymEnd: TimeKey,
  restDays: z.array(DayKeySchema).max(4),
  vegetarian: z.boolean(),
  noEggs: z.boolean(),
  noWhey: z.boolean(),
  kcalTarget: z.number().int().min(800).max(6000),
  proteinTarget: z.number().int().min(20).max(400),
  arcStart: DateKey,
  /** Null means open-ended. A fixed length is optional, not the default. */
  arcLength: z.number().int().min(7).max(3650).nullable(),
  createdAt: z.string(),

  // Inputs the plan model needs. Optional because every profile created before
  // the model existed lacks them, and those profiles still have to load.
  sex: z.enum(["male", "female"]).optional(),
  age: z.number().int().min(10).max(100).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  equipment: z.enum(["none", "dumbbell", "gym", "full"]).optional(),
  conditions: z.array(z.string().max(40)).max(20).optional(),
  injuries: z.array(z.string().max(40)).max(10).optional(),
  /** Where kcalTarget and proteinTarget came from, so the UI can say. */
  targetSource: z.enum(["model", "formula", "manual"]).optional(),
  /**
   * Which onboarding produced this profile. Missing or older means it was made
   * when onboarding came pre-filled with one person's details, so its numbers
   * cannot be trusted to be the Hunter's own and they set up again.
   */
  setupVersion: z.number().int().min(0).optional(),
});

/** The onboarding a profile must have completed to be used. */
export const SETUP_VERSION = 2;

/** Whether this profile came from a Hunter filling in their own details. */
export function isSetUp(profile: Profile | null | undefined): profile is Profile {
  return !!profile && (profile.setupVersion ?? 0) >= SETUP_VERSION;
}
export type Profile = z.infer<typeof ProfileSchema>;

export const SettingsSchema = z.object({
  skin: z.enum(["system", "permafrost", "whiteout"]),
  motion: z.enum(["system", "full", "reduced"]),
  sound: z.boolean(),
  haptics: z.boolean(),
  restSeconds: z.number().int().min(15).max(600),
  /**
   * Weeks each workout version holds for before the next one takes over. 0 is
   * off, which is what a missing value means: every arc made before rotating
   * existed trains the newest version and nothing else.
   */
  workoutRotationWeeks: z.number().int().min(0).max(2).optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SupplyItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  checked: z.boolean(),
});
export type SupplyItem = z.infer<typeof SupplyItemSchema>;

export const SuppliesSchema = z.object({
  weekOf: DateKey,
  items: z.array(SupplyItemSchema).max(60),
});
export type Supplies = z.infer<typeof SuppliesSchema>;

/** Everything the engine needs to derive progress. */
export type Snapshot = {
  profile: Profile | null;
  settings: Settings;
  workoutPlans: WorkoutPlan[];
  dietPlans: DietPlan[];
  dayLogs: DayLog[];
  weighIns: WeighIn[];
  supplies: Supplies;
};
