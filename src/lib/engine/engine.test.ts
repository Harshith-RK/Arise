import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, seedDietPlan, seedProfile, seedSupplies, seedWorkoutPlan } from "@/lib/data/seed";
import { addDays, dayKeyOf, toKey } from "./dates";
import { evaluateDay, makePlanLookup, mealLocked, MEAL_GRACE_MINUTES } from "./day";
import { deriveProgress } from "./derive";
import { diffProgress } from "./events";
import { epley, setScore } from "./pr";
import type { DayLog, Snapshot, WeighIn } from "./types";
import { levelForXp, rankForLevel, XP, xpForLevel } from "./xp";

/* ---------- fixtures ---------- */

const MONDAY = "2026-10-05"; // a Monday
const workoutPlan = seedWorkoutPlan("2026-10-01T00:00:00.000Z");
const dietPlan = seedDietPlan("2026-10-01T00:00:00.000Z");

function snap(logs: DayLog[] = [], weighIns: WeighIn[] = []): Snapshot {
  return {
    profile: seedProfile(MONDAY, "2026-10-01T00:00:00.000Z"),
    settings: DEFAULT_SETTINGS,
    workoutPlans: [workoutPlan],
    dietPlans: [dietPlan],
    dayLogs: logs,
    weighIns,
    supplies: seedSupplies(MONDAY),
  };
}

function emptyLog(date: string): DayLog {
  return {
    date,
    workoutPlanVersion: 1,
    dietPlanVersion: 1,
    exercises: {},
    meals: {},
    cardio: { done: false, kcal: 200, minutes: null },
    bonus: { done: false },
    sleep: null,
    updatedAt: `${date}T20:00:00.000Z`,
  };
}

type Opts = { workout?: boolean; diet?: boolean; cardio?: boolean; weight?: number; reps?: number; only?: string };

function dayLog(date: string, o: Opts = {}): DayLog {
  const { workout = true, diet = true, cardio = true, weight = 50, reps = 12 } = o;
  const log = emptyLog(date);
  const day = workoutPlan.days[dayKeyOf(date)];
  if (workout) {
    for (const id of day.exerciseIds) {
      if (o.only && o.only !== id) continue;
      const def = workoutPlan.exercises[id];
      log.exercises[id] = {
        variantId: def.variants[0].id,
        sets: Array.from({ length: def.targetSets }, () => ({ done: true, weight, reps })),
      };
    }
  }
  if (diet) for (const m of dietPlan.meals) log.meals[m.id] = { eaten: true, override: null };
  log.cardio.done = cardio;
  return log;
}

/** Clear every mandatory quest for `n` consecutive days starting at `from`. */
function clearDays(from: string, n: number): DayLog[] {
  return Array.from({ length: n }, (_, i) => dayLog(addDays(from, i)));
}

/* ---------- XP curve ---------- */

describe("level curve", () => {
  it("uses 100 x level to reach the next level", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(10)).toBe(4500);
    expect(xpForLevel(20)).toBe(19000);
  });

  it("resolves levels exactly on boundaries", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(4499)).toBe(9);
    expect(levelForXp(4500)).toBe(10);
    expect(levelForXp(122_500)).toBe(50);
    expect(levelForXp(122_499)).toBe(49);
  });

  it("ranks up every ten levels", () => {
    expect(rankForLevel(1)).toBe("E");
    expect(rankForLevel(9)).toBe("E");
    expect(rankForLevel(10)).toBe("D");
    expect(rankForLevel(19)).toBe("D");
    expect(rankForLevel(20)).toBe("C");
    expect(rankForLevel(30)).toBe("B");
    expect(rankForLevel(40)).toBe("A");
    expect(rankForLevel(49)).toBe("A");
    expect(rankForLevel(50)).toBe("S");
  });
});

/* ---------- Day evaluation ---------- */

describe("day evaluation", () => {
  const plans = makePlanLookup([workoutPlan], [dietPlan]);
  const profile = seedProfile(MONDAY);

  it("awards exercise, scaled workout bonus, meals, diet bonus and cardio", () => {
    const r = evaluateDay(MONDAY, dayLog(MONDAY), plans, profile);
    const n = workoutPlan.days.mon.exerciseIds.length; // 6
    expect(r.workoutComplete).toBe(true);
    expect(r.dietComplete).toBe(true);
    expect(r.cleared).toBe(true);
    expect(r.xp).toBe(n * XP.exercise + n * XP.workoutBonusPerExercise + 7 * XP.meal + XP.dietBonus + XP.cardio);
  });

  it("does not require a workout on rest days", () => {
    const sat = addDays(MONDAY, 5);
    const r = evaluateDay(sat, dayLog(sat, { workout: false }), plans, profile);
    expect(r.workoutMandatory).toBe(false);
    expect(r.cleared).toBe(true);
  });

  it("needs every target set for an exercise to count", () => {
    const log = dayLog(MONDAY, { only: "pull-ups" });
    log.exercises["pull-ups"].sets[3].done = false;
    const r = evaluateDay(MONDAY, log, plans, profile);
    expect(r.exercisesDone).toBe(0);
    expect(r.setsDone).toBe(3);
  });
});

/* ---------- Streaks ---------- */

describe("streaks", () => {
  it("banks the workout streak across the weekend", () => {
    const logs = clearDays(MONDAY, 6); // Mon..Sat, Sat has no workout
    const sat = addDays(MONDAY, 5);
    const p = deriveProgress(snap(logs), sat);
    expect(p.streaks.workout.count).toBe(5);
    expect(p.streaks.workout.state).toBe("banked");
    expect(p.streaks.diet.count).toBe(6);
    expect(p.streaks.diet.state).toBe("burning");

    const nextMon = addDays(MONDAY, 7);
    const p2 = deriveProgress(snap([...clearDays(MONDAY, 7), dayLog(nextMon)]), nextMon);
    expect(p2.streaks.workout.count).toBe(6);
    expect(p2.streaks.workout.state).toBe("burning");
  });

  it("breaks a streak on a missed mandatory day", () => {
    const tue = addDays(MONDAY, 1);
    const wed = addDays(MONDAY, 2);
    const logs = [dayLog(MONDAY), dayLog(tue, { workout: false })];
    const p = deriveProgress(snap(logs), wed);
    expect(p.streaks.workout.count).toBe(0);
    expect(p.streaks.workout.state).toBe("broken");
    expect(p.streaks.workout.brokenOn).toBe(tue);
    expect(p.streaks.diet.count).toBe(2);
  });

  it("does not break today's streak before the day is over", () => {
    const tue = addDays(MONDAY, 1);
    const p = deriveProgress(snap([dayLog(MONDAY)]), tue);
    expect(p.streaks.workout.count).toBe(1);
    expect(p.streaks.workout.state).toBe("burning");
    expect(p.streaks.workout.history[tue]).toBe("pending");
  });

  it("awards a Streak Shield and 200 XP once for seven cleared days", () => {
    const six = deriveProgress(snap(clearDays(MONDAY, 6)), addDays(MONDAY, 6));
    const seven = deriveProgress(snap(clearDays(MONDAY, 7)), addDays(MONDAY, 6));
    expect(six.badges["shield-7"].unlockedOn).toBeNull();
    expect(seven.badges["shield-7"].unlockedOn).toBe(addDays(MONDAY, 6));
    const day7 = seven.days[addDays(MONDAY, 6)].xp;
    expect(seven.xp - six.xp).toBe(day7 + XP.shield);
  });
});

/* ---------- Personal records ---------- */

describe("personal records", () => {
  const e = (w: number, r: number) => ({ done: true, weight: w, reps: r });
  function benchDay(date: string, sets: { done: boolean; weight: number; reps: number }[]): DayLog {
    const l = emptyLog(date);
    l.exercises["flat-bench"] = { variantId: "flat-bench.a", sets };
    return l;
  }
  const THU = addDays(MONDAY, 3);

  it("uses Epley e1RM, not raw weight", () => {
    expect(epley(60, 12)).toBeCloseTo(84, 5);
    expect(epley(65, 5)).toBeCloseTo(75.83, 1);
    expect(setScore(65, 5)).toBeLessThan(setScore(60, 12));
  });

  it("does not flag the first session or a heavier-but-weaker set", () => {
    const s1 = benchDay(THU, [e(60, 12), e(60, 12), e(60, 12), e(60, 12)]);
    const s2 = benchDay(addDays(THU, 7), [e(65, 5), e(65, 5), e(65, 5), e(65, 5)]);
    const p = deriveProgress(snap([s1, s2]), addDays(THU, 7));
    expect(p.records).toHaveLength(0);
  });

  it("flags a real improvement in estimated max", () => {
    const s1 = benchDay(THU, [e(60, 12)]);
    const s2 = benchDay(addDays(THU, 7), [e(62.5, 12)]);
    const p = deriveProgress(snap([s1, s2]), addDays(THU, 7));
    expect(p.records).toHaveLength(1);
    expect(p.records[0]).toMatchObject({ weight: 62.5, reps: 12, e1rm: 87.5 });
  });

  it("ignores sets that were not marked done", () => {
    const s1 = benchDay(THU, [e(60, 12)]);
    const s2 = benchDay(addDays(THU, 7), [{ done: false, weight: 100, reps: 12 }]);
    expect(deriveProgress(snap([s1, s2]), addDays(THU, 7)).records).toHaveLength(0);
  });
});

/* ---------- Undo symmetry and events ---------- */

describe("undo and events", () => {
  it("restoring the previous log restores identical progress", () => {
    const before = [dayLog(MONDAY, { diet: false })];
    const p0 = deriveProgress(snap(before), MONDAY);
    const changed = structuredClone(before);
    changed[0].meals["meal-1"] = { eaten: true, override: null };
    const p1 = deriveProgress(snap(changed), MONDAY);
    expect(p1.xp).toBe(p0.xp + XP.meal);
    const undone = deriveProgress(snap(before), MONDAY);
    expect(undone).toEqual(p0);
  });

  it("emits xp, level up and day cleared events", () => {
    const partial = dayLog(MONDAY, { cardio: false });
    const full = dayLog(MONDAY);
    const b = deriveProgress(snap([partial]), MONDAY);
    const a = deriveProgress(snap([full]), MONDAY);
    const events = diffProgress(b, a, MONDAY);
    const types = events.map((e) => e.type);
    expect(types).toContain("xp");
    expect(types).toContain("day_cleared");
    expect(types).toContain("badge"); // First Gate
    expect(b.level).toBe(2);
    expect(a.level).toBe(2);
  });

  it("emits a level up when crossing a boundary", () => {
    const b = deriveProgress(snap([dayLog(MONDAY, { workout: false, cardio: false })]), MONDAY); // 96 XP
    const a = deriveProgress(snap([dayLog(MONDAY, { workout: false })]), MONDAY); // 111 XP
    expect(b.level).toBe(1);
    expect(a.level).toBe(2);
    expect(diffProgress(b, a, MONDAY).some((e) => e.type === "level_up")).toBe(true);
  });
});

/* ---------- Meal time gate ---------- */

describe("meal time gate", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 5, h, m);

  it("locks a meal before its time on today", () => {
    expect(mealLocked(MONDAY, MONDAY, "21:30", at(7))).toBe(true);
    expect(mealLocked(MONDAY, MONDAY, "13:00", at(9))).toBe(true);
  });

  it("unlocks at its time, and a little before", () => {
    expect(mealLocked(MONDAY, MONDAY, "13:00", at(13))).toBe(false);
    expect(mealLocked(MONDAY, MONDAY, "13:00", at(14))).toBe(false);
    // the grace window
    expect(mealLocked(MONDAY, MONDAY, "13:00", at(12, 60 - MEAL_GRACE_MINUTES))).toBe(false);
    expect(mealLocked(MONDAY, MONDAY, "13:00", at(12, 0))).toBe(true);
  });

  it("never locks a past day, so a missed day can be back-filled", () => {
    expect(mealLocked(addDays(MONDAY, -1), MONDAY, "21:30", at(7))).toBe(false);
  });

  it("locks the earliest meal only in the small hours", () => {
    expect(mealLocked(MONDAY, MONDAY, "07:00", at(3))).toBe(true);
    expect(mealLocked(MONDAY, MONDAY, "07:00", at(6, 30))).toBe(false);
  });
});

/* ---------- Weigh-ins ---------- */

describe("weigh-ins", () => {
  it("awards XP once per ISO week", () => {
    const w = (date: string, kg: number): WeighIn => ({ date, weightKg: kg, bodyFatPct: null, muscleKg: null, visceral: null });
    const p = deriveProgress(snap([], [w(MONDAY, 95), w(addDays(MONDAY, 2), 94.8), w(addDays(MONDAY, 7), 94.2)]), addDays(MONDAY, 7));
    expect(p.totals.weighInWeeks).toBe(2);
    expect(p.xp).toBe(2 * XP.weighIn);
    expect(p.weighInDue).toBe(false);
  });
});

/* ---------- Dates ---------- */

describe("date rollover", () => {
  it("rolls the local day at midnight, not UTC", () => {
    expect(toKey(new Date(2026, 9, 5, 23, 59, 59))).toBe("2026-10-05");
    expect(toKey(new Date(2026, 9, 6, 0, 0, 0))).toBe("2026-10-06");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("knows the weekday of a key", () => {
    expect(dayKeyOf(MONDAY)).toBe("mon");
    expect(dayKeyOf(addDays(MONDAY, 6))).toBe("sun");
  });
});
