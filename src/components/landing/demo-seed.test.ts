import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demo-seed";
import { dayKeyOf, todayKey } from "@/lib/engine/dates";
import { makePlanLookup, trainingDayFor } from "@/lib/engine/day";

/**
 * The landing demo exists so a visitor can clear a quest. On a real rest day
 * the seed would otherwise render an empty "Rest day" panel with nothing to
 * tap, so the split is rotated onto whatever day it is.
 */
describe("landing demo seed", () => {
  it("always has a workout to clear, whatever day it is", () => {
    const snap = demoSnapshot();
    const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
    const day = trainingDayFor(todayKey(), plans.workout());
    expect(day.exerciseIds.length).toBeGreaterThan(0);
    expect(day.title).not.toBe("Rest");
  });

  it("keeps five training days and two rest days", () => {
    const snap = demoSnapshot();
    const plan = snap.workoutPlans[0];
    const training = Object.values(plan.days).filter((d) => d.exerciseIds.length > 0);
    expect(training).toHaveLength(5);
    expect(snap.profile?.restDays).toHaveLength(2);
    // Today is never a rest day in the demo.
    expect(snap.profile?.restDays).not.toContain(dayKeyOf(todayKey()));
  });

  it("carries history so the demo has a level and a streak", () => {
    const snap = demoSnapshot();
    expect(snap.dayLogs.length).toBeGreaterThan(5);
    expect(snap.weighIns.length).toBeGreaterThan(1);
  });
});
