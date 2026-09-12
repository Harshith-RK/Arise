import type { Rank } from "./types";

/** XP rewards. Spec 3.1 with the brief's section 10 corrections. */
export const XP = {
  exercise: 10,
  /** Full workout day bonus scales with exercise count so days are fair. */
  workoutBonusPerExercise: 8,
  meal: 8,
  dietBonus: 40,
  cardio: 15,
  bonusQuest: 20,
  weighIn: 20,
  /** XP per kg the scale moves toward the target. Negative when it moves away. */
  weighInDriftPerKg: 30,
  /** Movement under this is scale noise (water, time of day) and scores nothing. */
  weighInDeadbandKg: 0.2,
  /** Ceiling on one weigh-in's drift, so a mistyped number cannot wipe an arc. */
  weighInDriftCap: 90,
  shield: 200,
  shieldEvery: 7,
} as const;

/**
 * XP for the direction the scale moved, measured against the previous weigh-in.
 * Positive toward the target, negative away from it: the arc cares which way
 * the number went, not only that you stepped on the scale.
 *
 * Because it always compares against the last *logged* reading, skipping a bad
 * week does not dodge the cost. The gain is still there at the next weigh-in
 * and is charged then, in one piece.
 */
export function weighInDrift(prevKg: number, nextKg: number, cutting = true): number {
  // Rounded to the 0.1 kg the scale actually reports, so float noise
  // (95 - 94.8 = 0.19999...) cannot drop a real move into the deadband.
  const toward = Math.round((cutting ? prevKg - nextKg : nextKg - prevKg) * 10) / 10;
  if (Math.abs(toward) < XP.weighInDeadbandKg) return 0;
  const raw = Math.round(toward * XP.weighInDriftPerKg);
  return Math.max(-XP.weighInDriftCap, Math.min(XP.weighInDriftCap, raw));
}

/** True when the profile's goal is to lose weight (the usual winter arc). */
export function isCutting(startKg: number, targetKg: number): boolean {
  return targetKg <= startKg;
}

/** Cumulative XP required to *reach* `level` (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

/** XP needed to go from `level` to `level + 1`. Spec: 100 x current level. */
export function xpToNext(level: number): number {
  return 100 * level;
}

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  let level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
  // Guard float edges on exact boundaries.
  while (xpForLevel(level + 1) <= xp) level++;
  while (level > 1 && xpForLevel(level) > xp) level--;
  return level;
}

export function rankForLevel(level: number): Rank {
  if (level >= 50) return "S";
  if (level >= 40) return "A";
  if (level >= 30) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

export const RANK_TITLES: Record<Rank, string> = {
  E: "Frozen",
  D: "Kindled",
  C: "Burning",
  B: "Forged",
  A: "Molten",
  S: "White Heat",
};

export const RANK_FLOOR_LEVEL: Record<Rank, number> = { E: 1, D: 10, C: 20, B: 30, A: 40, S: 50 };

/** Position inside the current level: { into, span, ratio }. */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const span = xpToNext(level);
  const into = Math.max(0, xp - floor);
  return { level, into, span, ratio: Math.min(1, into / span), floor, next: floor + span };
}
