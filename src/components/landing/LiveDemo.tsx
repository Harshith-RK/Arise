"use client";

import { useState } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import { SandboxGameProvider, useGame, useGameActions } from "@/lib/store/GameProvider";
import { CoreGauge } from "@/components/system/CoreGauge";
import { ExerciseRow } from "@/components/quest/ExerciseRow";
import { MealRow } from "@/components/quest/MealRow";
import { CompletionSquare, StrikeLabel } from "@/components/quest/QuestBits";
import { Placeholder } from "@/components/system/primitives";
import { CeremonyHost } from "@/components/ceremonies/CeremonyHost";
import { SystemToaster } from "@/components/system/SystemToaster";
import { demoSnapshot } from "./demo-seed";
import { useGame as useGameState } from "@/lib/store/GameProvider";
import { makePlanLookup, mealsFor, trainingDayFor } from "@/lib/engine/day";
import { lastSessionFor } from "@/lib/engine/derive";
import { sendHeat } from "@/lib/heat-transfer";
import { xpGained } from "@/lib/store/apply-outcome";
import { vibrate } from "@/lib/motion";
import type { Outcome } from "@/lib/store/game-store";

/**
 * The real Quest components, the real engine, running on an in-memory
 * sandbox. Ticking a quest here fires the same ignite, heat transfer,
 * notice and ceremonies the app does. Resets on reload.
 */
export function LiveDemo() {
  return (
    <LazyMotion features={domAnimation} strict>
      <SandboxGameProvider seed={demoSnapshot}>
        <div data-scope="app" data-demo className="border border-line-2 bg-ink-1">
          <DemoBody />
          <CeremonyHost />
          <SystemToaster />
        </div>
      </SandboxGameProvider>
    </LazyMotion>
  );
}

function DemoBody() {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGameState((s) => s.progress);
  const today = useGame((s) => s.today);
  const { actions, dispatch } = useGameActions();
  const [tab, setTab] = useState<"workout" | "diet">("workout");

  if (!snapshot || !progress) return <Placeholder height={420} />;

  const plans = makePlanLookup(snapshot.workoutPlans, snapshot.dietPlans);
  const log = snapshot.dayLogs.find((l) => l.date === today);
  const wPlan = plans.workout(log?.workoutPlanVersion);
  const tday = trainingDayFor(today, wPlan);
  const exercises = tday.exerciseIds.map((id) => wPlan.exercises[id]).filter(Boolean).slice(0, 4);
  const meals = mealsFor(plans.diet(log?.dietPlanVersion), today).slice(0, 4);
  const result = progress.days[today];

  const run = async (fn: () => Promise<Outcome>, origin?: Element | null) => {
    const outcome = await fn();
    dispatch(outcome, { exerciseName: (id) => wPlan.exercises[id]?.variants[0].name ?? "Exercise" });
    const gained = xpGained(outcome);
    if (gained > 0 && origin) sendHeat(origin, gained);
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line-1 px-4 py-3">
        <CoreGauge into={progress.levelInto} span={progress.levelSpan} level={progress.level} compact />
        <span className="t-micro shrink-0 text-frost-2">RANK {progress.rank}</span>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="t-readout text-frost-0">{tday.exerciseIds.length ? `${tday.title} day` : "Rest day"}</p>
          <p className="t-micro mt-0.5 text-frost-2">
            ARC DAY {progress.arcDay} / {result?.xp ?? 0} XP TODAY
          </p>
        </div>
        <div className="flex border border-line-2" role="group" aria-label="Demo section">
          {(["workout", "diet"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className="pressable t-micro h-11 border-r border-line-2 px-4 text-frost-2 transition-none last:border-r-0 aria-pressed:bg-ember aria-pressed:text-on-ember"
            >
              {t === "workout" ? "LIFT" : "EAT"}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line-1">
        {tab === "workout"
          ? exercises.map((def) => {
              const exLog = log?.exercises[def.id];
              const variantId = exLog?.variantId ?? def.variants[0].id;
              return (
                <ExerciseRow
                  key={def.id}
                  def={def}
                  variantId={variantId}
                  sets={exLog?.sets ?? []}
                  done={(exLog?.sets.filter((s) => s.done).length ?? 0) >= def.targetSets}
                  isPr={false}
                  lastSession={lastSessionFor(snapshot, def.id, variantId, today)}
                  readOnly={false}
                  onCompleteAll={(weight, reps) => {
                    void run(() => actions.completeExercise(today, def.id, weight, reps), document.activeElement);
                    vibrate(10);
                  }}
                  onReopen={() => void run(() => actions.reopenExercise(today, def.id))}
                  onToggleSet={(i, patch) => void run(() => actions.logSet(today, def.id, i, patch))}
                  onVariant={(vid) => void run(() => actions.setVariant(today, def.id, vid))}
                />
              );
            })
          : meals.map((meal) => (
              <MealRow
                key={meal.id}
                meal={meal}
                eaten={!!log?.meals[meal.id]?.eaten}
                override={log?.meals[meal.id]?.override ?? null}
                readOnly={false}
                onToggle={() => void run(() => actions.toggleMeal(today, meal.id), document.activeElement)}
                onOverride={(m) => void run(() => actions.setMealOverride(today, meal.id, m))}
              />
            ))}

        <div className="flex items-center gap-3 border-t border-line-1 px-4 py-3">
          <button
            type="button"
            onClick={(e) => void run(() => actions.toggleCardio(today), e.currentTarget)}
            aria-pressed={!!result?.cardioComplete}
            data-quest-row
            className="pressable flex min-h-14 flex-1 items-center gap-3 text-left"
          >
            <CompletionSquare done={!!result?.cardioComplete} size={20} />
            <span>
              <StrikeLabel done={!!result?.cardioComplete} className="t-small">
                Daily cardio
              </StrikeLabel>
              <span className="t-micro mt-0.5 block text-frost-2">200 KCAL / +15 XP</span>
            </span>
          </button>
        </div>
      </div>

      <p className="t-micro border-t border-line-1 px-4 py-3 text-frost-2">
        SANDBOX. NOTHING HERE IS SAVED.
      </p>
    </>
  );
}
