import { addDays, diffDays, weekStart } from "./dates";
import type { Snapshot, WorkoutPlan } from "./types";

/* ==========================================================================
   Rotating workout versions.

   A Hunter can keep more than one workout plan and train them in turn: week A,
   week B, week A again. Rotation switches on a Monday rather than on the day it
   was turned on, so a week is never cut in half, and it reads off the calendar
   rather than being stored per day: a day already logged keeps the version it
   was logged under, so turning rotation on or off never rewrites history.
   ========================================================================== */

/** How many weeks each version holds for. `weeks: 0` is off. */
export type WorkoutRotation = { weeks: number; from: string };

export const ROTATION_CHOICES = [0, 1, 2] as const;
export type RotationWeeks = (typeof ROTATION_CHOICES)[number];

export function rotationLabel(weeks: number): string {
  if (weeks === 1) return "Every week";
  if (weeks === 2) return "Every 2 weeks";
  return "Off";
}

/**
 * The rotation in force, or null when there is nothing to rotate: it is off, or
 * there is only one version to train.
 */
export function rotationOf(snap: Pick<Snapshot, "settings" | "profile" | "workoutPlans">): WorkoutRotation | null {
  const weeks = snap.settings.workoutRotationWeeks ?? 0;
  if (weeks < 1 || snap.workoutPlans.length < 2) return null;
  return { weeks, from: snap.profile?.arcStart ?? weekStart(snap.workoutPlans[0].createdAt.slice(0, 10)) };
}

/** Which turn of the rotation `date` falls in, counting from the arc's first week. */
function blockIndex(rotation: WorkoutRotation, date: string): number {
  const weeksIn = diffDays(weekStart(rotation.from), weekStart(date)) / 7;
  return Math.floor(weeksIn / rotation.weeks);
}

function ascending(plans: Pick<WorkoutPlan, "version">[]): number[] {
  return plans.map((p) => p.version).sort((a, b) => a - b);
}

/** The workout version `date` trains on. Versions cycle oldest first. */
export function rotatedVersion(
  plans: Pick<WorkoutPlan, "version">[],
  rotation: WorkoutRotation | null,
  date: string,
): number {
  const versions = ascending(plans);
  const last = versions[versions.length - 1];
  if (!rotation || versions.length < 2) return last;
  const i = blockIndex(rotation, date);
  // A date before the arc started rotates backward, so the modulo is normalized.
  return versions[((i % versions.length) + versions.length) % versions.length];
}

/** The plan a date trains on: the whole workout, not only its version number. */
export function activeWorkoutPlan(
  snap: Pick<Snapshot, "settings" | "profile" | "workoutPlans">,
  date: string,
): WorkoutPlan {
  const version = rotatedVersion(snap.workoutPlans, rotationOf(snap), date);
  return snap.workoutPlans.find((p) => p.version === version) ?? snap.workoutPlans[snap.workoutPlans.length - 1];
}

/** The Monday the version changes next, and what it changes to. */
export function nextRotationChange(
  plans: Pick<WorkoutPlan, "version">[],
  rotation: WorkoutRotation | null,
  date: string,
): { date: string; version: number } | null {
  if (!rotation || plans.length < 2) return null;
  const blockStart = weekStart(rotation.from);
  const weeksIn = diffDays(blockStart, weekStart(date)) / 7;
  const nextBlock = Math.floor(weeksIn / rotation.weeks) + 1;
  const when = addDays(blockStart, nextBlock * rotation.weeks * 7);
  return { date: when, version: rotatedVersion(plans, rotation, when) };
}
