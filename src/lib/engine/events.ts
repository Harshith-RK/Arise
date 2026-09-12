import type { PersonalRecord, Progress, StatKey, StreakCategory } from "./derive";
import type { Rank } from "./types";
import { RANKS } from "./types";

/* ==========================================================================
   System events: the diff between progress before and after an action.
   Drives notices and the ceremony queue. Undo produces the inverse diff,
   which the UI treats as a quiet rollback (no ceremonies).
   ========================================================================== */

export type SystemEvent =
  | { type: "xp"; amount: number }
  | { type: "level_up"; from: number; to: number; statDeltas: { key: StatKey; delta: number }[] }
  | { type: "rank_up"; from: Rank; to: Rank }
  | { type: "streak_milestone"; category: StreakCategory; count: number }
  | { type: "pr"; record: PersonalRecord }
  | { type: "trophy"; id: string }
  | { type: "day_cleared"; date: string; arcDay: number; dayXp: number };

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90] as const;

export function diffProgress(before: Progress, after: Progress, date: string): SystemEvent[] {
  const events: SystemEvent[] = [];

  const gained = after.xp - before.xp;
  if (gained !== 0) events.push({ type: "xp", amount: gained });

  if (after.level > before.level) {
    const statDeltas = (Object.keys(after.stats) as StatKey[])
      .map((key) => ({ key, delta: after.stats[key].value - before.stats[key].value }))
      .filter((s) => s.delta > 0);
    events.push({ type: "level_up", from: before.level, to: after.level, statDeltas });
  }

  if (RANKS.indexOf(after.rank) > RANKS.indexOf(before.rank)) {
    events.push({ type: "rank_up", from: before.rank, to: after.rank });
  }

  for (const cat of Object.keys(after.streaks) as StreakCategory[]) {
    const b = before.streaks[cat].count;
    const a = after.streaks[cat].count;
    if (a > b && (STREAK_MILESTONES as readonly number[]).includes(a)) {
      events.push({ type: "streak_milestone", category: cat, count: a });
    }
  }

  const seen = new Set(before.records.map((r) => `${r.date}:${r.variantId}`));
  for (const r of after.records) {
    if (!seen.has(`${r.date}:${r.variantId}`)) events.push({ type: "pr", record: r });
  }

  for (const id of Object.keys(after.trophies)) {
    if (after.trophies[id].unlockedOn && !before.trophies[id]?.unlockedOn) {
      events.push({ type: "trophy", id });
    }
  }

  const bd = before.days[date];
  const ad = after.days[date];
  if (ad?.cleared && !bd?.cleared) {
    events.push({ type: "day_cleared", date, arcDay: after.arcDay, dayXp: ad.xp });
  }

  return events;
}
