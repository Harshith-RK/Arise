import { DAY_KEYS, type DayKey, type ExerciseDef, type TrainingDay, type WorkoutPlan } from "@/lib/engine/types";
import { timeToMinutes } from "@/lib/engine/dates";
import { EXERCISE_BY_ID, EXERCISES, usable, type DeltFocus, type Exercise, type Muscle, type TrainingPrefs } from "./library/exercises";

/* ==========================================================================
   Workout plan generator.

   A split and weekly sets per muscle in (the model's output), a week of
   sessions out:
     1. lay the split over the Hunter's actual training days
     2. divide each muscle's weekly sets across the sessions that train it
     3. pick movements they can do with their gear, skill and injuries,
        compounds first, not repeating one within the week while others exist
     4. trim isolation work if a session will not fit the gym window
   ========================================================================== */

export type WorkoutInput = TrainingPrefs & {
  split: string;
  weeklySets: Record<string, number>;
  repRange: [number, number];
  restDays: readonly string[];
  gymStart: string;
  gymEnd: string;
};

/** A muscle slot within a session; `delt` narrows shoulders to one head. */
type Target = { muscle: Muscle; delt?: DeltFocus[] };

type Focus = { title: string; targets: Target[] };

const FULL: Target[] = [
  { muscle: "quads" },
  { muscle: "chest" },
  { muscle: "back" },
  { muscle: "hams" },
  { muscle: "delts", delt: ["side", "press"] },
  { muscle: "glutes" },
  { muscle: "biceps" },
  { muscle: "triceps" },
  { muscle: "calves" },
];
const UPPER: Target[] = [
  { muscle: "chest" },
  { muscle: "back" },
  { muscle: "delts", delt: ["side", "press", "rear"] },
  { muscle: "biceps" },
  { muscle: "triceps" },
];
const LOWER: Target[] = [{ muscle: "quads" }, { muscle: "hams" }, { muscle: "glutes" }, { muscle: "calves" }];
const PUSH: Target[] = [{ muscle: "chest" }, { muscle: "delts", delt: ["press", "side"] }, { muscle: "triceps" }];
const PULL: Target[] = [{ muscle: "back" }, { muscle: "delts", delt: ["rear"] }, { muscle: "biceps" }];

const SPLIT_FOCI: Record<string, Focus[]> = {
  full_body_x2: [
    { title: "Full Body A", targets: FULL },
    { title: "Full Body B", targets: FULL },
  ],
  full_body_x3: [
    { title: "Full Body A", targets: FULL },
    { title: "Full Body B", targets: FULL },
    { title: "Full Body C", targets: FULL },
  ],
  upper_lower_x2: [
    { title: "Upper A", targets: UPPER },
    { title: "Lower A", targets: LOWER },
    { title: "Upper B", targets: UPPER },
    { title: "Lower B", targets: LOWER },
  ],
  ppl_upper_lower: [
    { title: "Push", targets: PUSH },
    { title: "Pull", targets: PULL },
    { title: "Legs", targets: LOWER },
    { title: "Upper", targets: UPPER },
    { title: "Lower", targets: LOWER },
  ],
  ppl_x2: [
    { title: "Push A", targets: PUSH },
    { title: "Pull A", targets: PULL },
    { title: "Legs A", targets: LOWER },
    { title: "Push B", targets: PUSH },
    { title: "Pull B", targets: PULL },
    { title: "Legs B", targets: LOWER },
  ],
};

/** Weekly sets for a library muscle, from the model's eight groups. */
function weeklyFor(muscle: Muscle, sets: Record<string, number>): number {
  if (muscle === "biceps" || muscle === "triceps") return (sets.arms ?? 0) / 2;
  return sets[muscle] ?? 0;
}

function repsFor(ex: Exercise, [low, high]: [number, number]): [number, number] {
  if (ex.muscle === "calves") return [12, 20];
  if (ex.bodyweight && !ex.compound) return [10, 20];
  if (ex.bodyweight) return [Math.max(6, low), Math.max(high, 15)];
  if (ex.compound) return [low, high];
  return [Math.min(low + 2, 15), Math.min(high + 3, 25)];
}

/** Muscles where a compound lift is the backbone; elsewhere isolation leads. */
const COMPOUND_LED = new Set<Muscle>(["chest", "back", "quads", "hams", "glutes"]);
const SKILL_SWEET_SPOT = { beginner: 1, intermediate: 2, advanced: 3 } as const;

/**
 * Lower is better. Order of concerns: something new this week, loaded work when
 * there is gear to load it, the right kind of movement for the muscle, and a
 * skill level that fits the Hunter.
 */
function rank(e: Exercise, target: Target, input: WorkoutInput, usedThisWeek = new Map<string, number>()): number {
  // Repeating a good compound twice a week is normal programming; the penalty
  // only has to break ties toward variety, not force a worse movement in.
  let r = (usedThisWeek.get(e.id) ?? 0) * 8;
  // Floor work gives way to loaded work when there is gear. A pull-up bar is
  // gear: pull-ups are the standard, not the fallback.
  if (input.equipment !== "none" && e.gear.length === 1 && e.gear[0] === "bodyweight") r += 30;
  // Lower back work is a finisher, never the main back movement of a session.
  if (e.region === "Lower Back") r += 12;
  const pressHead = target.muscle === "delts" && e.delt === "press";
  if (COMPOUND_LED.has(target.muscle) || pressHead) r += e.compound ? 0 : 10;
  else r += e.compound ? 10 : 0;
  r += Math.abs(e.skill - SKILL_SWEET_SPOT[input.experience]) * 4;
  return r;
}

/** Split `total` into `n` whole parts that differ by at most one. */
function spread(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export function generateWorkout(input: WorkoutInput): Omit<WorkoutPlan, "version" | "createdAt"> {
  const foci = SPLIT_FOCI[input.split] ?? SPLIT_FOCI.full_body_x3;
  const trainingKeys = DAY_KEYS.filter((d) => !input.restDays.includes(d));

  // Lay the split over the week, spacing sessions across the training days.
  const sessions: { key: DayKey; focus: Focus | null }[] = trainingKeys.map((key) => ({ key, focus: null }));
  foci.forEach((focus, i) => {
    const at = Math.round((i * trainingKeys.length) / foci.length);
    sessions[Math.min(at, sessions.length - 1)].focus = focus;
  });

  // How many sessions train each target, to divide its weekly sets.
  const hits = new Map<string, number>();
  const keyOf = (t: Target) => `${t.muscle}:${(t.delt ?? []).join(",")}`;
  const muscleHits = new Map<Muscle, number>();
  for (const s of sessions) {
    if (!s.focus) continue;
    for (const t of s.focus.targets) {
      hits.set(keyOf(t), (hits.get(keyOf(t)) ?? 0) + 1);
      muscleHits.set(t.muscle, (muscleHits.get(t.muscle) ?? 0) + 1);
    }
  }

  // Divide each muscle's weekly sets across its sessions up front, so rounding
  // never loses or invents a set over the week.
  const perSession = new Map<Muscle, number[]>();
  for (const [muscle, n] of muscleHits) perSession.set(muscle, spread(Math.round(weeklyFor(muscle, input.weeklySets)), n));
  const cursor = new Map<Muscle, number>();

  const usedThisWeek = new Map<string, number>();
  const exercises: Record<string, ExerciseDef> = {};
  const days = {} as Record<DayKey, TrainingDay>;

  const window = timeToMinutes(input.gymEnd) - timeToMinutes(input.gymStart);
  // About 2.5 minutes a working set with rest, leaving 25 for cardio after.
  const capacity = window >= 45 && window <= 300 ? Math.floor((window - 25) / 2.5) : 40;

  for (const key of DAY_KEYS) {
    if (input.restDays.includes(key)) days[key] = { title: "Rest", exerciseIds: [] };
  }

  for (const session of sessions) {
    if (!session.focus) {
      // More training days than the split has sessions: a light day, not a rest day.
      days[session.key] = { title: "Active Recovery", exerciseIds: [] };
      continue;
    }
    const picked: { ex: Exercise; sets: number }[] = [];

    for (const target of session.focus.targets) {
      const i = cursor.get(target.muscle) ?? 0;
      cursor.set(target.muscle, i + 1);
      const sets = perSession.get(target.muscle)?.[i] ?? 0;
      if (sets <= 0) continue;

      const pool = EXERCISES.filter(
        (e) =>
          e.muscle === target.muscle &&
          (!target.delt || (e.delt && target.delt.includes(e.delt))) &&
          usable(e, input) &&
          !picked.some((p) => p.ex.id === e.id),
      ).sort((a, b) => rank(a, target, input, usedThisWeek) - rank(b, target, input, usedThisWeek) || a.id.localeCompare(b.id));
      if (!pool.length) continue;

      const count = Math.min(pool.length, sets <= 4 ? 1 : sets <= 8 ? 2 : 3);
      // Shoulders asked for several heads get one movement per head when possible.
      const chosen: Exercise[] = [];
      for (const head of target.delt ?? []) {
        if (chosen.length >= count) break;
        const e = pool.find((p) => p.delt === head && !chosen.includes(p));
        if (e) chosen.push(e);
      }
      // Two movements for one muscle should hit it two ways: lats and mid back,
      // flat and incline, rather than the same row twice.
      // Variety is worth a small step down in fit, not a big one: a floor hold
      // is not a fair trade for a second row.
      const bestRank = pool.length ? rank(pool[0], target, input, usedThisWeek) : 0;
      for (const fresh of [true, false]) {
        for (const e of pool) {
          if (chosen.length >= count) break;
          if (chosen.includes(e)) continue;
          if (fresh && chosen.some((c) => c.region === e.region)) continue;
          if (fresh && rank(e, target, input, usedThisWeek) - bestRank > 20) continue;
          chosen.push(e);
        }
      }
      spread(sets, chosen.length).forEach((n, j) => {
        if (n > 0) picked.push({ ex: chosen[j], sets: Math.min(n, 6) });
      });
    }

    // Too long for the window: take sets off isolation work first, then drop it.
    let total = picked.reduce((s, p) => s + p.sets, 0);
    for (let guard = 0; total > capacity && guard < 200; guard++) {
      const iso = [...picked].reverse().find((p) => !p.ex.compound && p.sets > 1) ?? [...picked].reverse().find((p) => p.sets > 1);
      if (!iso) break;
      iso.sets--;
      total--;
    }

    for (const { ex, sets } of picked) {
      usedThisWeek.set(ex.id, (usedThisWeek.get(ex.id) ?? 0) + 1);
      const [repsMin, repsMax] = repsFor(ex, input.repRange);
      const variants = [
        { id: `${ex.id}.a`, name: ex.name, repsMin, repsMax },
        ...ex.swaps
          .map((id) => EXERCISE_BY_ID[id])
          .filter((s): s is Exercise => !!s && usable(s, input))
          .slice(0, 2)
          .map((s) => {
            const [min, max] = repsFor(s, input.repRange);
            return { id: `${ex.id}.${s.id}`, name: s.name, repsMin: min, repsMax: max };
          }),
      ];
      const existing = exercises[ex.id];
      exercises[ex.id] = {
        id: ex.id,
        muscleRegion: ex.region,
        // One definition per movement: if it appears twice, the bigger session sets it.
        targetSets: Math.max(existing?.targetSets ?? 0, sets),
        variants,
        bodyweight: ex.bodyweight,
      };
    }
    days[session.key] = { title: session.focus.title, exerciseIds: picked.map((p) => p.ex.id) };
  }

  return { days, exercises };
}
