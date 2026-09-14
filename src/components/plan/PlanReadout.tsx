"use client";

import { SPLIT_LABEL } from "@/lib/plan/rules";
import type { PlanRefusal, PlanTargets } from "@/lib/plan/targets";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "CHEST",
  back: "BACK",
  quads: "QUADS",
  hams: "HAMSTRINGS",
  glutes: "GLUTES",
  delts: "SHOULDERS",
  arms: "ARMS",
  calves: "CALVES",
};

/**
 * What the System calculated, in one block. Says where the numbers came from,
 * because "the model" and "the formula, since you are outside what the model
 * was trained on" are different claims and the Hunter should know which.
 */
export function PlanReadout({ plan }: { plan: PlanTargets | PlanRefusal }) {
  if (plan.refused) {
    return (
      <div className="border border-fault px-4 py-4" role="alert">
        <p className="t-readout text-fault">NO TARGETS SET</p>
        <p className="t-small mt-2 text-frost-1">{plan.reason}</p>
        <p className="t-micro mt-3 text-frost-2">
          YOU CAN STILL LOG WORKOUTS AND MEALS. ENTER TARGETS FROM YOUR CLINICIAN BELOW.
        </p>
      </div>
    );
  }

  const direction = plan.deficit > 0 ? "DEFICIT" : plan.deficit < 0 ? "SURPLUS" : "MAINTENANCE";
  const sets = Object.values(plan.weeklySets).reduce((a, b) => a + b, 0);

  const rows: [string, string][] = [
    ["INTAKE", `${plan.kcal} KCAL`],
    ["PROTEIN", `${plan.proteinG} G`],
    ["CARBS / FAT", `${plan.carbsG} G / ${plan.fatG} G`],
    ["BMR / TDEE", `${plan.bmr} / ${plan.tdee} KCAL`],
    [direction, plan.deficit === 0 ? "EAT AT TDEE" : `${Math.abs(plan.deficit)} KCAL / DAY`],
    ["PROJECTED", plan.weeklyKgChange === 0 ? "HOLD WEIGHT" : `${Math.abs(plan.weeklyKgChange).toFixed(2)} KG / WEEK`],
    ["BODY FAT", `${plan.bodyFatPct}%${plan.bodyFatEstimated ? " ESTIMATED" : ""}`],
    ["SPLIT", (SPLIT_LABEL[plan.split] ?? plan.split).toUpperCase()],
    ["VOLUME", `${sets} SETS / WEEK, ${plan.repRange[0]} TO ${plan.repRange[1]} REPS`],
    ["CARDIO", `${plan.cardioSessions} SESSIONS / WEEK`],
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="t-micro text-frost-2">SYSTEM CALCULATED</p>
        <p className="t-micro text-frost-2">{plan.source === "model" ? "TRAINED MODEL" : "FORMULA"}</p>
      </div>
      <dl className="mt-2 divide-y divide-line-1 border-y border-line-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="t-micro shrink-0 text-frost-2">{k}</dt>
            <dd className="t-readout text-right text-frost-0">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid grid-cols-4 gap-px border border-line-1 bg-line-1">
        {Object.entries(plan.weeklySets).map(([m, n]) => (
          <div key={m} className="bg-ink-1 px-1 py-2 text-center">
            <p className="t-micro truncate text-frost-2">{MUSCLE_LABEL[m] ?? m}</p>
            <p className="t-readout mt-0.5 text-frost-0">{n}</p>
          </div>
        ))}
      </div>

      {plan.source === "formula" && plan.fallbackReason && plan.fallbackReason !== "model unavailable" ? (
        <p className="t-micro mt-3 text-glacier">
          USED THE FORMULA: {plan.fallbackReason.toUpperCase()}. THE MODEL IS ONLY TRUSTED INSIDE WHAT IT WAS TRAINED ON.
        </p>
      ) : null}
      {plan.clamped.some((c) => c === "floor" || c === "loss_rate") ? (
        <p className="t-micro mt-3 text-glacier">INTAKE WAS RAISED TO A SAFE MINIMUM. A FASTER CUT THAN THIS COSTS MUSCLE.</p>
      ) : null}
      {plan.bodyFatEstimated ? (
        <p className="t-micro mt-3 text-frost-2">
          BODY FAT IS ESTIMATED FROM BMI. A SCAN READING MAKES EVERY NUMBER HERE MORE ACCURATE.
        </p>
      ) : null}
    </div>
  );
}
