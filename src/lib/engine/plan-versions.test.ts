import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, seedDietPlan, seedProfile, seedSupplies, seedWorkoutPlan } from "@/lib/data/seed";
import { addDays } from "./dates";
import { canDeleteVersion, daysLoggedOn } from "./plan-versions";
import type { DayLog, Snapshot } from "./types";

const TODAY = "2026-10-05";
const workout = seedWorkoutPlan("2026-10-01T00:00:00.000Z");
const diet = seedDietPlan("2026-10-01T00:00:00.000Z");

function log(date: string, workoutPlanVersion: number, dietPlanVersion = 1): DayLog {
  return {
    date,
    workoutPlanVersion,
    dietPlanVersion,
    exercises: {},
    meals: {},
    cardio: { done: false, kcal: 200, minutes: null },
    bonus: { done: false },
    sleep: null,
    updatedAt: `${date}T20:00:00.000Z`,
  };
}

function snap(versions: number, dayLogs: DayLog[] = []): Snapshot {
  return {
    profile: seedProfile(TODAY, "2026-10-01T00:00:00.000Z"),
    settings: DEFAULT_SETTINGS,
    workoutPlans: Array.from({ length: versions }, (_, i) => ({ ...workout, version: i + 1 })),
    dietPlans: Array.from({ length: versions }, (_, i) => ({ ...diet, version: i + 1 })),
    dayLogs,
    weighIns: [],
    supplies: seedSupplies(TODAY),
  };
}

describe("deleting a plan version", () => {
  it("refuses the only version, so there is always something to follow", () => {
    const check = canDeleteVersion(snap(1), "workout", 1, TODAY);
    expect(check).toMatchObject({ ok: false, why: "only" });
  });

  it("refuses a version the past was logged on, and counts the days", () => {
    const s = snap(2, [log(addDays(TODAY, -3), 1), log(addDays(TODAY, -2), 1), log(addDays(TODAY, -1), 2)]);
    const check = canDeleteVersion(s, "workout", 1, TODAY);
    expect(check).toMatchObject({ ok: false, why: "logged" });
    if (!check.ok) expect(check.reason).toContain("2 days");
    // The version only yesterday used is just as protected.
    expect(canDeleteVersion(s, "workout", 2, TODAY).ok).toBe(false);
  });

  it("allows one that only today and tomorrow use, since those have not happened", () => {
    const s = snap(2, [log(TODAY, 2), log(addDays(TODAY, 1), 2)]);
    expect(daysLoggedOn(s, "workout", 2, TODAY)).toBe(0);
    expect(canDeleteVersion(s, "workout", 2, TODAY).ok).toBe(true);
  });

  it("counts the two plans separately", () => {
    // A day logged on workout v2 says nothing about diet v2.
    const s = snap(2, [log(addDays(TODAY, -1), 2, 1)]);
    expect(canDeleteVersion(s, "workout", 2, TODAY).ok).toBe(false);
    expect(canDeleteVersion(s, "diet", 2, TODAY).ok).toBe(true);
  });

  it("refuses a version that is not there", () => {
    expect(canDeleteVersion(snap(2), "workout", 7, TODAY)).toMatchObject({ ok: false, why: "gone" });
  });
});
