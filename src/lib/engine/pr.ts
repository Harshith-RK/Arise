/**
 * Personal records compare Epley estimated one-rep max, never raw weight, so
 * 65 kg x 5 after 60 kg x 12 is not a false record.
 */
export function epley(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Comparable score for a set. Loaded sets score by e1RM. Bodyweight sets
 * (weight 0) score by reps on a tiny scale so any added load outranks them.
 */
export function setScore(weight: number | null, reps: number | null): number {
  const w = weight ?? 0;
  const r = reps ?? 0;
  if (r <= 0) return 0;
  if (w > 0) return epley(w, r);
  return r / 1000;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
