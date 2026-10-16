import { addDays, eachDay } from "./dates";
import type { DayResult } from "./day";
import { exercisesOf, makePlanLookup, trainingDayFor } from "./day";
import { rotationOf } from "./rotation";
import type { ExerciseDef, Snapshot } from "./types";

/* ==========================================================================
   Making up a missed training day.

   A gate missed on Tuesday is not wiped out by Saturday's rest: it is repeated
   on it. The work is logged on the day it is actually done and pays its XP
   there, and once the whole of the missed day is in, deriveProgress hands the
   workout back to the Tuesday it belonged to, which is what keeps the streak
   whole. Half a make-up buys nothing.
   ========================================================================== */

/** A missed training day, with the exercises it asked for. */
export type MakeUp = {
  date: string;
  title: string;
  exercises: ExerciseDef[];
};

/** How far back a miss can still be repaired. */
export const MAKE_UP_WINDOW_DAYS = 14;

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
 * Missed training days that `date` could still make up: inside the window,
 * gone by, never cleared, and not already claimed by another day. Most recent
 * first, because that is the one a Challenger means.
 */
export function openMisses(
  snap: Snapshot,
  days: Record<string, DayResult>,
  date: string,
  window = MAKE_UP_WINDOW_DAYS,
): MakeUp[] {
  const claimed = new Set(snap.dayLogs.filter((l) => l.date !== date && l.makeUpFor).map((l) => l.makeUpFor!));
  const out: MakeUp[] = [];
  for (const d of eachDay(addDays(date, -window), addDays(date, -1))) {
    const r = days[d];
    if (!r || !r.workoutMandatory || r.workoutComplete || r.madeUpOn || claimed.has(d)) continue;
    const m = load(snap, d);
    if (m.exercises.length) out.push(m);
  }
  return out.reverse();
}
