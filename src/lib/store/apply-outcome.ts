import type { Ceremony, CeremonyQueue } from "@/lib/ceremony";
import { notify } from "@/components/system/notify";
import { round1 } from "@/lib/engine/pr";
import type { Outcome } from "./game-store";

const CATEGORY_LABEL: Record<string, string> = { workout: "Workout", diet: "Diet", cardio: "Cardio" };

/**
 * Turns one action's Outcome into System notices and a batch of ceremonies.
 * Only level up, rank up and day cleared claim the screen (queued, in that
 * order); PRs and streak milestones are announced as their own notice and
 * otherwise handled locally (e.g. a PR seal stamped on the exercise row).
 */
export function applyOutcome(
  queue: CeremonyQueue,
  outcome: Outcome,
  ctx: { exerciseName?: (id: string) => string } = {},
): void {
  const ceremonies: Ceremony[] = [];
  for (const e of outcome.events) {
    if (e.type === "level_up") {
      ceremonies.push({ kind: "level_up", from: e.from, to: e.to, statDeltas: e.statDeltas });
    } else if (e.type === "rank_up") {
      ceremonies.push({ kind: "rank_up", from: e.from, to: e.to });
    } else if (e.type === "day_cleared") {
      ceremonies.push({ kind: "day_cleared", arcDay: e.arcDay, dayXp: e.dayXp });
      notify({ tag: "Gate Cleared", text: `Day ${e.arcDay} complete. +${e.dayXp} XP.`, tone: "ember" });
    } else if (e.type === "pr") {
      const name = ctx.exerciseName?.(e.record.exerciseId) ?? "Exercise";
      notify({
        tag: "Notice",
        text: `New record on ${name}. ${e.record.weight} KG x ${e.record.reps}. e1RM ${round1(e.record.e1rm)} KG.`,
        tone: "brass",
      });
    } else if (e.type === "streak_milestone") {
      notify({
        tag: "Streak",
        text: `${CATEGORY_LABEL[e.category] ?? e.category} streak reached ${e.count} days.`,
        tone: "ember",
      });
    }
  }
  if (ceremonies.length) queue.push(ceremonies);
}

/** Net XP gained by one Outcome (for the heat-transfer flight amount). */
export function xpGained(outcome: Outcome): number {
  return outcome.events.reduce((s, e) => (e.type === "xp" ? s + e.amount : s), 0);
}
