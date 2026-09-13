import type { DietPlan, ExerciseDef, Profile, Settings, Supplies, WorkoutPlan } from "@/lib/engine/types";
import { weekStart } from "@/lib/engine/dates";

/* ==========================================================================
   Seed data from docs/spec.md sections 2, 5 and 6. A starting snapshot,
   fully editable afterwards. Exercise and meal IDs are stable forever.
   ========================================================================== */

type Ex = [id: string, name: string, region: string, repsMin: number, repsMax: number, extra?: Partial<ExerciseDef> & { alt?: [string, string, number, number] }];

function ex([id, name, region, repsMin, repsMax, extra]: Ex): ExerciseDef {
  const variants = [{ id: `${id}.a`, name, repsMin, repsMax }];
  if (extra?.alt) {
    const [altId, altName, altMin, altMax] = extra.alt;
    variants.push({ id: `${id}.${altId}`, name: altName, repsMin: altMin, repsMax: altMax });
  }
  return { id, muscleRegion: region, targetSets: 4, variants, bodyweight: extra?.bodyweight ?? false };
}

const BACK: Ex[] = [
  ["pull-ups", "Pull Ups", "Lats", 12, 12, { bodyweight: true }],
  ["bb-row", "Bent Over Barbell Row", "Mid Back", 12, 15],
  ["lat-pulldown", "Neutral Grip Lat Pulldown", "Lats", 12, 15],
  ["straight-arm", "Straight-Arm Pulldown", "Lats", 12, 15],
  ["seated-row", "Seated Row", "Mid Back", 12, 15],
  ["hyperext", "Hyperextension", "Lower Back", 12, 12, { alt: ["b", "Deadlift", 12, 12] }],
];
const SHOULDERS: Ex[] = [
  ["military-press", "Military Press", "Front Delts", 12, 15],
  ["lateral-raise", "Lateral Raise", "Side Delts", 15, 20],
  ["front-raise", "Barbell Front Raise", "Front Delts", 12, 15],
  ["upright-row", "Upright Row", "Side Delts", 12, 15, { alt: ["b", "Cable Upright Row", 12, 15] }],
  ["face-pull", "Face Pull", "Rear Delts", 12, 15],
];
const ARMS: Ex[] = [
  ["alt-db-curl", "Alternate Dumbbell Curl", "Biceps", 12, 15],
  ["hammer-curl", "Hammer Curl", "Brachialis", 12, 12],
  ["preacher-curl", "Preacher Curl", "Biceps", 12, 12],
  ["cable-curl", "Single Arm Cable Curl", "Biceps", 12, 12, { alt: ["b", "Concentration Curl", 12, 12] }],
  ["sa-pushdown", "Single Arm Pushdown", "Triceps", 12, 15],
  ["skull-crusher", "Skull Crusher", "Triceps", 12, 15],
  ["rope-pushdown", "Rope Pushdown", "Triceps", 12, 15],
  ["dips", "Dips", "Triceps", 12, 15, { bodyweight: true }],
];
const CHEST: Ex[] = [
  ["flat-bench", "Flat Bench Press", "Chest", 12, 15],
  ["fly-high-low", "High to Low Cable Fly", "Lower Chest", 12, 15],
  ["fly-low-high", "Low to High Cable Fly", "Upper Chest", 12, 15],
  ["fly-mid", "Shoulder Height Cable Fly", "Mid Chest", 12, 15],
  ["incline-smith", "Incline Smith Press", "Upper Chest", 12, 15],
  ["decline-press", "Decline Press", "Lower Chest", 12, 15],
];
const LEGS: Ex[] = [
  ["squat", "Squat", "Quads", 12, 12],
  ["leg-ext", "Leg Extension", "Quads", 12, 15],
  ["leg-curl", "Seated Leg Curl", "Hamstrings", 12, 15],
  ["leg-press", "Leg Press", "Quads", 12, 15],
  ["lying-curl", "Lying Hamstring Curl", "Hamstrings", 12, 15],
  ["rdl", "Romanian Deadlift", "Hamstrings", 10, 12],
  ["calf-raise", "Calf Raise", "Calves", 15, 20],
];

export function seedWorkoutPlan(now = new Date().toISOString()): WorkoutPlan {
  const all = [...BACK, ...SHOULDERS, ...ARMS, ...CHEST, ...LEGS].map(ex);
  const ids = (list: Ex[]) => list.map((e) => e[0]);
  return {
    version: 1,
    createdAt: now,
    exercises: Object.fromEntries(all.map((e) => [e.id, e])),
    days: {
      mon: { title: "Back", exerciseIds: ids(BACK) },
      tue: { title: "Shoulders", exerciseIds: ids(SHOULDERS) },
      wed: { title: "Biceps and Triceps", exerciseIds: ids(ARMS) },
      thu: { title: "Chest", exerciseIds: ids(CHEST) },
      fri: { title: "Legs", exerciseIds: ids(LEGS) },
      sat: { title: "Rest", exerciseIds: [] },
      sun: { title: "Rest", exerciseIds: [] },
    },
  };
}

export function seedDietPlan(now = new Date().toISOString()): DietPlan {
  return {
    version: 1,
    createdAt: now,
    meals: [
      { id: "meal-1", time: "07:00", name: "Besan chilla and milk", items: ["Besan chilla (2, 50g besan)", "Milk 200ml"], protein: 17, carbs: 39, fat: 15, kcal: 360, group: null },
      { id: "meal-2", time: "10:00", name: "Curd and roasted chana", items: ["Curd 200g", "Roasted chana 30g"], protein: 13, carbs: 27, fat: 10, kcal: 230, group: null },
      { id: "meal-3", time: "13:00", name: "Soya curry, rice and dal", items: ["Soya chunks curry (70g dry)", "Rice 75g cooked", "Dal 150g cooked"], protein: 49, carbs: 62, fat: 12, kcal: 558, group: null },
      { id: "meal-4", time: "17:00", name: "Sprouts chaat", items: ["Sprouts chaat 100g", "Roasted chana 15g"], protein: 10, carbs: 28, fat: 1, kcal: 160, group: null },
      { id: "meal-5", time: "18:15", name: "Pre-workout", items: ["Banana", "Roasted chana 15g"], protein: 4, carbs: 36, fat: 1, kcal: 160, group: null },
      { id: "meal-6", time: "21:15", name: "Post-workout milk", items: ["Milk 250ml", "Banana"], protein: 9, carbs: 39, fat: 9, kcal: 258, group: "Post-workout block" },
      { id: "meal-7", time: "21:30", name: "Paneer, dal and chilla", items: ["Paneer sabzi (110g paneer)", "Dal 150g cooked", "Besan chilla (2, 60g besan)"], protein: 43, carbs: 46, fat: 40, kcal: 719, group: "Post-workout block" },
    ],
  };
}

export function seedProfile(arcStart: string, now = new Date().toISOString()): Profile {
  return {
    name: "Harshith RK",
    heightCm: 175.5,
    startWeightKg: 95.5,
    targetWeightKg: 72.7,
    phase1TargetKg: 85.5,
    bodyFatPct: 35.3,
    muscleKg: 34.9,
    visceral: 14,
    bmr: 1705,
    gymStart: "19:00",
    gymEnd: "21:00",
    restDays: ["sat", "sun"],
    vegetarian: true,
    noEggs: true,
    noWhey: true,
    kcalTarget: 2445,
    proteinTarget: 145,
    arcStart,
    arcLength: null,
    createdAt: now,
  };
}

export const DEFAULT_SETTINGS: Settings = {
  skin: "system",
  motion: "system",
  sound: false,
  haptics: true,
  restSeconds: 90,
};

export const SUPPLY_NAMES = [
  "Soya chunks",
  "Besan",
  "Paneer",
  "Dal (rotate rajma, chana, moong, toor)",
  "Curd",
  "Milk",
  "Roasted chana",
  "Sprouts",
  "Bananas",
  "Rice",
];

export function seedSupplies(today: string): Supplies {
  return {
    weekOf: weekStart(today),
    items: SUPPLY_NAMES.map((name, i) => ({ id: `supply-${i + 1}`, name, checked: false })),
  };
}
