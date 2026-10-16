import { addDays, eachDay, weekStart } from "./dates";
import type { DayResult } from "./day";
import { exercisesOf, makePlanLookup, trainingDayFor } from "./day";
import { rotationOf } from "./rotation";
import type { ExerciseDef, Snapshot } from "./types";

/* ==========================================================================
   Making up a missed training day.

   A gate missed on Tuesday can still be finished before the week is out: on
   the rest day, or on any later day of that week. What this buys is the work
   and not the streak: a streak counts days in a row, and Tuesday was not one
   of them. The XP is paid on the day the work is actually done, and once the
   whole of the missed day is in, the missed-gate charge is dropped. Half a
   make-up buys nothing, and a new week closes the chance for good.
   ========================================================================== */

/** A missed training day, with the exercises it asked for. */
export type MakeUp = {
  date: string;
  title: string;
  exercises: ExerciseDef[];
};

function load(snap: Snapshot, date: string): MakeUp {
  const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans, rotationOf(snap));
  const version = snap.dayLogs.find((l) => l.date === date)?.workoutPlanVersion;
  const plan = plans.workout(version, date);
  return { date, title: trainingDayFor(date, plan).title, exercises: exercisesOf(date, plan) };
}

/** The missed day this day is repeating, if it is repeating one. */
export function makeUpOf(snap: Snapshot, date: string): MakeUp | null {
  const missed = snap.dayLogs.find((l) => l.date === date)?.makeUpFor;
  return missed ? load(snap, missed) : null;
}

/**
 * Missed training days that `date` could still make up: earlier in the same
 * week, never cleared, and not already claimed by another day. Most recent
 * first, because that is the one a Challenger means.
 */
export function openMisses(snap: Snapshot, days: Record<string, DayResult>, date: string): MakeUp[] {
  const claimed = new Set(snap.dayLogs.filter((l) => l.date !== date && l.makeUpFor).map((l) => l.makeUpFor!));
  const out: MakeUp[] = [];
  for (const d of eachDay(weekStart(date), addDays(date, -1))) {
    const r = days[d];
    if (!r || !r.workoutMandatory || r.workoutComplete || r.madeUpOn || claimed.has(d)) continue;
    const m = load(snap, d);
    if (m.exercises.length) out.push(m);
  }
  return out.reverse();
}
