import type { DayLog, Snapshot } from "./types";

/* ==========================================================================
   Removing a plan version.

   A day log records the version it was trained or eaten on, and progress is
   derived from that. Deleting a version a past day was logged under would
   quietly re-score that day against a different plan, changing XP already
   earned. So history wins: a version that the past depends on cannot be
   removed, and the reason is said out loud. Today and any day ahead have not
   happened yet, so they simply move to a version that remains.
   ========================================================================== */

export type DeleteCheck = { ok: true } | { ok: false; why: "gone" | "only" | "logged"; reason: string };

export type PlanKind = "workout" | "diet";

const versionOf = (log: DayLog, kind: PlanKind) => (kind === "workout" ? log.workoutPlanVersion : log.dietPlanVersion);

/** The past days logged on a version. Today and later are not counted: they can move. */
export function daysLoggedOn(snap: Snapshot, kind: PlanKind, version: number, today: string): number {
  return snap.dayLogs.filter((l) => l.date < today && versionOf(l, kind) === version).length;
}

/** Whether a version can be removed, and what stops it when it cannot. */
export function canDeleteVersion(snap: Snapshot, kind: PlanKind, version: number, today: string): DeleteCheck {
  const plans = kind === "workout" ? snap.workoutPlans : snap.dietPlans;
  if (!plans.some((p) => p.version === version)) return { ok: false, why: "gone", reason: "That version is already gone." };
  if (plans.length < 2) return { ok: false, why: "only", reason: "This is the only version. There would be nothing left to follow." };
  const logged = daysLoggedOn(snap, kind, version, today);
  if (logged > 0) {
    return {
      ok: false,
      why: "logged",
      reason: `${logged} day${logged === 1 ? "" : "s"} already logged on version ${version}. Deleting it would rescore them.`,
    };
  }
  return { ok: true };
}
