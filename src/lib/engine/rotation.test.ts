import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, seedDietPlan, seedProfile, seedSupplies, seedWorkoutPlan } from "@/lib/data/seed";
import { addDays } from "./dates";
import { makePlanLookup } from "./day";
import { activeWorkoutPlan, nextRotationChange, rotatedVersion, rotationOf } from "./rotation";
import type { Snapshot, WorkoutPlan } from "./types";

const MONDAY = "2026-10-05"; // a Monday, and the arc's first day
const base = seedWorkoutPlan("2026-10-01T00:00:00.000Z");

function versions(n: number): WorkoutPlan[] {
  return Array.from({ length: n }, (_, i) => ({ ...base, version: i + 1 }));
}

function snap(count: number, weeks?: number): Snapshot {
  return {
    profile: seedProfile(MONDAY, "2026-10-01T00:00:00.000Z"),
    settings: { ...DEFAULT_SETTINGS, workoutRotationWeeks: weeks },
    workoutPlans: versions(count),
    dietPlans: [seedDietPlan("2026-10-01T00:00:00.000Z")],
    dayLogs: [],
    weighIns: [],
    supplies: seedSupplies(MONDAY),
  };
}

describe("workout rotation", () => {
  it("is off until there is a second version to turn to", () => {
    expect(rotationOf(snap(1, 1))).toBeNull();
    expect(rotationOf(snap(2, 0))).toBeNull();
    expect(rotationOf(snap(2, 1))).toEqual({ weeks: 1, from: MONDAY });
  });

  it("trains the newest version when it is off", () => {
    const s = snap(3);
    expect(rotatedVersion(s.workoutPlans, rotationOf(s), addDays(MONDAY, 40))).toBe(3);
  });

  it("hands each version a week in turn, and comes back around", () => {
    const s = snap(2, 1);
    const r = rotationOf(s);
    const on = (days: number) => rotatedVersion(s.workoutPlans, r, addDays(MONDAY, days));
    expect(on(0)).toBe(1);
    expect(on(6)).toBe(1); // still the first week
    expect(on(7)).toBe(2);
    expect(on(14)).toBe(1);
  });

  it("holds a version for two weeks when asked", () => {
    const s = snap(2, 2);
    const r = rotationOf(s);
    const on = (days: number) => rotatedVersion(s.workoutPlans, r, addDays(MONDAY, days));
    expect(on(0)).toBe(1);
    expect(on(13)).toBe(1);
    expect(on(14)).toBe(2);
    expect(on(28)).toBe(1);
  });

  it("switches on a Monday, not on the day the week started mid-way", () => {
    const s = snap(2, 1);
    const r = rotationOf(s);
    // Thursday of week one and the Sunday after it are the same turn.
    expect(rotatedVersion(s.workoutPlans, r, addDays(MONDAY, 3))).toBe(1);
    expect(rotatedVersion(s.workoutPlans, r, addDays(MONDAY, 6))).toBe(1);
    expect(nextRotationChange(s.workoutPlans, r, addDays(MONDAY, 3))).toEqual({ date: addDays(MONDAY, 7), version: 2 });
  });

  it("says nothing changes next when there is no rotation", () => {
    const s = snap(2);
    expect(nextRotationChange(s.workoutPlans, rotationOf(s), MONDAY)).toBeNull();
  });

  it("gives a logged day the version it was logged under, not the rotation's", () => {
    const s = snap(2, 1);
    const plans = makePlanLookup(s.workoutPlans, s.dietPlans, rotationOf(s));
    const nextWeek = addDays(MONDAY, 7);
    expect(plans.workout(undefined, nextWeek).version).toBe(2);
    expect(plans.workout(1, nextWeek).version).toBe(1);
  });

  it("returns the whole plan for a date, not only its number", () => {
    const s = snap(2, 1);
    expect(activeWorkoutPlan(s, addDays(MONDAY, 7)).version).toBe(2);
    expect(activeWorkoutPlan(s, MONDAY).version).toBe(1);
  });
});
