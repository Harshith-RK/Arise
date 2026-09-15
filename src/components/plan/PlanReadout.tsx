"use client";

import { SPLIT_LABEL } from "@/lib/plan/rules";
import type { PlanRefusal, PlanTargets } from "@/lib/plan/targets";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "CHEST",
  back: "BACK",
  quads: "QUADS",
  hams: "HAMS",
  glutes: "GLUTES",
  delts: "DELTS",
  arms: "ARMS",
  calves: "CALVES",
};

/**
 * What the System calculated. Three numbers up front, the ones a Hunter acts on
 * each day; everything behind them (BMR, TDEE, body fat, split, volume) is one
 * tap away rather than a wall of rows.
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

  const change =
    plan.weeklyKgChange === 0
      ? "HOLD"
      : `${plan.deficit > 0 ? "-" : "+"}${Math.abs(plan.weeklyKgChange).toFixed(2)}`;
  const sets = Object.values(plan.weeklySets).reduce((a, b) => a + b, 0);

  const rows: [string, string][] = [
    ["CARBS / FAT", `${plan.carbsG} G / ${plan.fatG} G`],
    ["BMR / TDEE", `${plan.bmr} / ${plan.tdee} KCAL`],
    [plan.deficit >= 0 ? "DEFICIT" : "SURPLUS", `${Math.abs(plan.deficit)} KCAL / DAY`],
    ["BODY FAT", `${plan.bodyFatPct}%${plan.bodyFatEstimated ? " EST." : ""}`],
    ["SPLIT", (SPLIT_LABEL[plan.split] ?? plan.split).toUpperCase()],
    ["VOLUME", `${sets} SETS / WEEK, ${plan.repRange[0]} TO ${plan.repRange[1]} REPS`],
    ["CARDIO", `${plan.cardioSessions} / WEEK`],
  ];

  return (
    <div>
      <dl className="grid grid-cols-3 gap-px border border-line-1 bg-line-1">
        {[
          ["INTAKE", String(plan.kcal), "KCAL"],
          ["PROTEIN", String(plan.proteinG), "G"],
          ["PER WEEK", change, plan.weeklyKgChange === 0 ? "" : "KG"],
        ].map(([label, value, unit]) => (
          <div key={label} className="bg-ink-1 px-3 py-3">
            <dt className="t-micro text-frost-2">{label}</dt>
            <dd className="mt-1 text-frost-0">
              <span className="t-num" style={{ fontSize: 24, lineHeight: 1 }}>
                {value}
              </span>
              {unit ? <span className="t-micro ml-1 text-frost-2">{unit}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="t-micro mt-2 text-frost-2">
        {plan.source === "model" ? "CALCULATED BY THE TRAINED MODEL" : "CALCULATED BY FORMULA"}
      </p>

      <details className="mt-3 border border-line-1">
        <summary className="pressable t-micro flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-frost-1">
          FULL BREAKDOWN
          <span aria-hidden className="text-frost-2">+</span>
        </summary>
        <dl className="divide-y divide-line-1 border-t border-line-1 px-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="t-micro shrink-0 text-frost-2">{k}</dt>
              <dd className="t-micro text-right text-frost-0">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="grid grid-cols-4 gap-px border-t border-line-1 bg-line-1">
          {Object.entries(plan.weeklySets).map(([m, n]) => (
            <div key={m} className="bg-ink-1 px-1 py-2 text-center">
              <p className="t-micro text-frost-2">{MUSCLE_LABEL[m] ?? m}</p>
              <p className="t-readout mt-0.5 text-frost-0">{n}</p>
            </div>
          ))}
        </div>
      </details>

      {plan.source === "formula" && plan.fallbackReason && plan.fallbackReason !== "model unavailable" ? (
        <p className="t-micro mt-3 text-glacier">
          USED THE FORMULA: {plan.fallbackReason.toUpperCase()}. THE MODEL IS ONLY TRUSTED INSIDE WHAT IT WAS TRAINED ON.
        </p>
      ) : null}
      {plan.clamped.some((c) => c === "floor" || c === "loss_rate") ? (
        <p className="t-micro mt-3 text-glacier">INTAKE WAS RAISED TO A SAFE MINIMUM. A FASTER CUT THAN THIS COSTS MUSCLE.</p>
      ) : null}
      {plan.bodyFatEstimated ? (
        <p className="t-micro mt-3 text-frost-2">BODY FAT IS ESTIMATED FROM BMI. A SCAN READING SHARPENS EVERY NUMBER.</p>
      ) : null}
    </div>
  );
}
