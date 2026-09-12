"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { SystemWindow } from "@/components/system/SystemWindow";
import { Meter, Odometer, Placeholder, Readout } from "@/components/system/primitives";
import { CategoryPanel } from "./CategoryPanel";
import { ExerciseRow } from "./ExerciseRow";
import { MealRow } from "./MealRow";
import { CompletionSquare, StrikeLabel, WeightStepper } from "./QuestBits";
import { RestTimer } from "./RestTimer";
import { RecoveryRow } from "./RecoveryRow";
import { IconBack, IconBonus, IconCalendar, IconDumbbell, IconForward, IconMeal, IconSleep } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { addDays, formatReadout } from "@/lib/engine/dates";
import { evaluateDay, isRestDay, makePlanLookup, mealLocked, trainingDayFor } from "@/lib/engine/day";
import { lastSessionFor, VITALITY_UNLOCK_LEVEL } from "@/lib/engine/derive";
import { sendHeat } from "@/lib/heat-transfer";
import { xpGained } from "@/lib/store/apply-outcome";
import type { Outcome } from "@/lib/store/game-store";
import { vibrate } from "@/lib/motion";

type Category = "workout" | "diet" | "recovery";

export function QuestScreen({ date }: { date: string }) {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  const today = useGame((s) => s.today);
  const { actions, dispatch } = useGameActions();

  // undefined means "not chosen yet", which falls back to the derived default.
  const [chosenCategory, setChosenCategory] = useState<Category | null | undefined>(undefined);
  const [restKey, setRestKey] = useState<number | null>(null);
  // Ticks so a meal unlocks itself the moment its time arrives.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const [prExercises, setPrExercises] = useState<Set<string>>(new Set());
  const lastUndo = useRef<(() => Promise<void>) | null>(null);
  const rowRefs = useRef<HTMLElement[]>([]);

  const isFuture = date > today;
  const readOnly = isFuture;
  const recoverySealed = (progress?.level ?? 1) < VITALITY_UNLOCK_LEVEL;

  const view = useMemo(() => {
    if (!snapshot || !progress) return null;
    const plans = makePlanLookup(snapshot.workoutPlans, snapshot.dietPlans);
    const log = snapshot.dayLogs.find((l) => l.date === date);
    const wPlan = plans.workout(log?.workoutPlanVersion);
    const dPlan = plans.diet(log?.dietPlanVersion);
    const profile = snapshot.profile ?? { restDays: ["sat", "sun"] as const };
    const result = evaluateDay(date, log, plans, profile);
    const tday = trainingDayFor(date, wPlan);
    const rest = isRestDay(date, profile);
    return {
      log,
      result,
      rest,
      trainingDay: tday,
      exercises: tday.exerciseIds.map((id) => wPlan.exercises[id]).filter(Boolean),
      meals: dPlan.meals,
    };
  }, [snapshot, progress, date]);

  // The first unfinished category is derived, not stored: the panel opens
  // itself until the Hunter makes a choice.
  const defaultCategory: Category | null = !view
    ? null
    : view.rest
      ? !view.result.dietComplete
        ? "diet"
        : "workout"
      : !view.result.workoutComplete || !view.result.cardioComplete
        ? "workout"
        : !view.result.dietComplete
          ? "diet"
          : null;
  const openCategory = chosenCategory === undefined ? defaultCategory : chosenCategory;

  const run = useCallback(
    async (fn: () => Promise<Outcome>, originEl?: Element | null) => {
      const outcome = await fn();
      lastUndo.current = outcome.undo;
      const exerciseName = (id: string) => {
        const snap = snapshot;
        if (!snap) return "Exercise";
        const plan = snap.workoutPlans.reduce((a, b) => (b.version > a.version ? b : a));
        return plan.exercises[id]?.variants[0].name ?? "Exercise";
      };
      dispatch(outcome, { exerciseName });
      const gained = xpGained(outcome);
      if (gained > 0 && originEl) sendHeat(originEl, gained);
      const prs = outcome.events.filter((e) => e.type === "pr");
      if (prs.length) {
        setPrExercises((prev) => {
          const next = new Set(prev);
          for (const p of prs) if (p.type === "pr") next.add(p.record.exerciseId);
          return next;
        });
      }
      return outcome;
    },
    [dispatch, snapshot],
  );

  /* Keyboard: J/K move between quests, Space clears (native button), E opens
     details, U undoes the last action. Keyboard actions never animate. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-quest-row]"));
      rowRefs.current = rows;
      const idx = rows.indexOf(document.activeElement as HTMLElement);
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        rows[Math.min(rows.length - 1, idx + 1)]?.focus();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        rows[Math.max(0, idx - 1)]?.focus();
      } else if (e.key === "e" || e.key === "E") {
        if (idx < 0) return;
        e.preventDefault();
        rows[idx].closest("[class*='row-rule']")?.querySelector<HTMLButtonElement>("button[aria-label^='Open details'], button[aria-label^='Details']")?.click();
      } else if (e.key === "u" || e.key === "U") {
        if (!lastUndo.current) return;
        e.preventDefault();
        void lastUndo.current();
        lastUndo.current = null;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!snapshot || !progress || !view) {
    return (
      <div className="space-y-4">
        <Placeholder height={132} />
        <Placeholder height={220} />
      </div>
    );
  }

  const { result, meals, exercises, rest, trainingDay, log } = view;
  const arcDay = snapshot.profile ? Math.max(1, 1 + daysBetween(snapshot.profile.arcStart, date)) : 1;
  const arcLength = snapshot.profile?.arcLength ?? 90;

  return (
    <>
      <DayNav date={date} today={today} />

      <SystemWindow className="mb-4" bodyClassName="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="t-display-2 text-frost-0">{rest ? "Rest day" : `${trainingDay.title} day`}</h1>
            <p className="t-micro mt-1.5 text-frost-2">
              {formatReadout(date).toUpperCase()} / ARC DAY {arcDay} OF {arcLength}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="t-num text-ember" style={{ fontSize: 34, lineHeight: 1 }}>
              <Odometer value={result.xp} />
            </p>
            <p className="t-micro mt-1 text-frost-2">XP TODAY</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {/* Cardio counts inside the session now, so the gate is the whole
              workout: lifts plus the cardio that belongs to it. */}
          <GateMeter
            label="Workout"
            done={result.exercisesDone + (result.cardioComplete ? 1 : 0)}
            total={result.exerciseTotal + (result.cardioMandatory ? 1 : 0)}
            mandatory={result.workoutMandatory}
          />
          <GateMeter label="Diet" done={result.mealsEaten} total={result.mealTotal} mandatory />
        </div>
      </SystemWindow>

      <PenaltyBanner date={date} today={today} cleared={result.cleared} />

      <div className="space-y-4">
        <CategoryPanel
          title={rest ? "Bonus quest" : "Workout"}
          Icon={rest ? IconBonus : IconDumbbell}
          done={rest ? (result.bonusDone ? 1 : 0) : result.exercisesDone + (result.cardioComplete ? 1 : 0)}
          total={rest ? 1 : result.exerciseTotal + 1}
          complete={rest ? result.bonusDone : result.workoutComplete && result.cardioComplete}
          open={openCategory === "workout"}
          onToggle={() => setChosenCategory(openCategory === "workout" ? null : "workout")}
          summary={rest ? "Optional. Your workout streak is banked." : `${trainingDay.title} and cardio cleared.`}
        >
          {rest ? (
            <button
              type="button"
              disabled={readOnly}
              data-quest-row
              onClick={(e) => void run(() => actions.toggleBonus(date), e.currentTarget)}
              aria-pressed={result.bonusDone}
              className="pressable flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
            >
              <CompletionSquare done={result.bonusDone} />
              <span className="min-w-0 flex-1">
                <StrikeLabel done={result.bonusDone} className="t-body">
                  Abs or cardio
                </StrikeLabel>
                <span className="t-micro mt-0.5 block text-frost-2">OPTIONAL. STREAK IS BANKED. +20 XP</span>
              </span>
            </button>
          ) : exercises.length ? (
            exercises.map((def) => {
              const exLog = log?.exercises[def.id];
              const variantId = exLog?.variantId ?? def.variants[0].id;
              return (
                <ExerciseRow
                  key={def.id}
                  def={def}
                  variantId={variantId}
                  sets={exLog?.sets ?? []}
                  done={(exLog?.sets.filter((s) => s.done).length ?? 0) >= def.targetSets}
                  isPr={prExercises.has(def.id)}
                  lastSession={lastSessionFor(snapshot, def.id, variantId, date)}
                  readOnly={readOnly}
                  onCompleteAll={(weight, reps, source) => {
                    const origin = source === "pointer" ? document.activeElement : null;
                    void run(() => actions.completeExercise(date, def.id, weight, reps), origin);
                    if (source === "pointer") vibrate(10);
                    setRestKey(Date.now());
                  }}
                  onReopen={() => void run(() => actions.reopenExercise(date, def.id))}
                  onToggleSet={(i, patch) => {
                    void run(() => actions.logSet(date, def.id, i, patch));
                    if (patch.done) setRestKey(Date.now());
                  }}
                  onVariant={(vid) => void run(() => actions.setVariant(date, def.id, vid))}
                />
              );
            })
          ) : (
            <p className="t-small px-4 py-6 text-frost-2">No exercises scheduled for this day.</p>
          )}

          {/* Cardio closes the session. Rest days do not carry one: the bonus
              quest above already offers abs or cardio if the Hunter wants it. */}
          {rest ? null : (
            <div className="border-t border-line-1">
              <CardioRow
                key={`cardio-${date}`}
                date={date}
                done={result.cardioComplete}
                kcal={log?.cardio.kcal ?? 200}
                minutes={log?.cardio.minutes ?? null}
                readOnly={readOnly}
                onToggle={(el) => void run(() => actions.toggleCardio(date), el)}
                onDetails={(kcal, minutes) => void run(() => actions.setCardioDetails(date, kcal, minutes))}
              />
            </div>
          )}
        </CategoryPanel>

        <CategoryPanel
          title="Diet"
          Icon={IconMeal}
          done={result.mealsEaten}
          total={result.mealTotal}
          complete={result.dietComplete}
          open={openCategory === "diet"}
          onToggle={() => setChosenCategory(openCategory === "diet" ? null : "diet")}
          summary="Every planned meal eaten."
        >
          {meals.map((meal) => (
            <MealRow
              key={meal.id}
              meal={meal}
              eaten={!!log?.meals[meal.id]?.eaten}
              override={log?.meals[meal.id]?.override ?? null}
              readOnly={readOnly}
              locked={mealLocked(date, today, meal.time, now)}
              onToggle={() => void run(() => actions.toggleMeal(date, meal.id), document.activeElement)}
              onOverride={(macros) => void run(() => actions.setMealOverride(date, meal.id, macros))}
            />
          ))}
        </CategoryPanel>

      </div>

      {/* Always present, sealed until VITALITY unlocks: the stat told you sleep
          grows it, so there has to be somewhere that sleep visibly goes. */}
      <div className="mt-4">
        <CategoryPanel
          title="Recovery"
          Icon={IconSleep}
          done={log?.sleep?.hours != null ? 1 : 0}
          total={1}
          complete={log?.sleep?.hours != null}
          locked={recoverySealed}
          open={openCategory === "recovery"}
          onToggle={() => setChosenCategory(openCategory === "recovery" ? null : "recovery")}
          summary={
            recoverySealed
              ? `Unlocks at level ${VITALITY_UNLOCK_LEVEL}.`
              : `${log?.sleep?.hours ?? 0} h logged.`
          }
        >
          <RecoveryRow
            key={`recovery-${date}`}
            level={progress.level}
            hours={log?.sleep?.hours ?? null}
            waterL={log?.sleep?.waterL ?? null}
            readOnly={readOnly}
            onSave={(h, w) => void run(() => actions.setSleep(date, h, w))}
          />
        </CategoryPanel>
      </div>

      <RestTimer
        key={restKey ?? "idle"}
        seconds={snapshot.settings.restSeconds}
        runKey={restKey}
        sound={snapshot.settings.sound}
        onClose={() => setRestKey(null)}
      />
    </>
  );
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);
}

function GateMeter({ label, done, total, mandatory }: { label: string; done: number; total: number; mandatory: boolean }) {
  const complete = total > 0 && done >= total;
  return (
    <div className="surface-well px-3 py-3">
      <div className="flex items-center justify-between">
        <Readout className={complete ? "text-ember" : "text-frost-1"}>{label}</Readout>
        <span className="t-micro text-frost-2">
          {mandatory ? `${done}/${total}` : "OPTIONAL"}
        </span>
      </div>
      <Meter
        className="mt-2"
        value={done}
        max={Math.max(1, total)}
        cells={Math.min(12, Math.max(4, total))}
        label={`${label} progress`}
        valueText={`${done} of ${total} complete`}
        height={8}
      />
    </div>
  );
}

function DayNav({ date, today }: { date: string; today: string }) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Link
        href={`/app/quest/${prev}`}
        className="pressable flex h-11 items-center gap-2 border border-line-2 px-3 text-frost-1 transition-none hov:bg-ink-2 hov:text-frost-0"
        aria-label={`Previous day, ${formatReadout(prev)}`}
      >
        <IconBack size={15} />
        <span className="t-micro hidden sm:inline">PREV</span>
      </Link>
      <div className="flex items-center gap-2">
        {date !== today ? (
          <Link href="/app/quest" className="pressable t-micro flex h-11 items-center gap-2 border border-ember px-3 text-ember transition-none">
            <IconCalendar size={15} />
            BACK TO TODAY
          </Link>
        ) : (
          <span className="t-micro flex h-11 items-center gap-2 px-1 text-frost-2">
            <IconCalendar size={15} />
            TODAY
          </span>
        )}
      </div>
      <Link
        href={`/app/quest/${next}`}
        className="pressable flex h-11 items-center gap-2 border border-line-2 px-3 text-frost-1 transition-none hov:bg-ink-2 hov:text-frost-0"
        aria-label={`Next day, ${formatReadout(next)}`}
      >
        <span className="t-micro hidden sm:inline">NEXT</span>
        <IconForward size={15} />
      </Link>
    </div>
  );
}

/** Penalty zone: after 22:00 with the day still open. */
function PenaltyBanner({ date, today, cleared }: { date: string; today: string; cleared: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (date !== today || cleared || now.getHours() < 22) return null;
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const ms = endOfDay.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <m.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 border border-fault bg-ink-1 px-4 py-3"
      role="alert"
    >
      <p className="t-micro text-fault">PENALTY ZONE</p>
      <p className="t-small mt-1 text-frost-1">
        {h}H {String(mins).padStart(2, "0")}M to clear today&apos;s gate.
      </p>
    </m.div>
  );
}

function CardioRow({
  done,
  kcal,
  minutes,
  readOnly,
  onToggle,
  onDetails,
}: {
  date: string;
  done: boolean;
  kcal: number;
  minutes: number | null;
  readOnly: boolean;
  onToggle: (el: Element | null) => void;
  onDetails: (kcal: number, minutes: number | null) => void;
}) {
  const [k, setK] = useState(kcal);
  const [mins, setMins] = useState<number>(minutes ?? 45);

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        disabled={readOnly}
        data-quest-row
        aria-pressed={done}
        onClick={(e) => onToggle(e.currentTarget)}
        className="pressable flex min-h-16 w-full items-center gap-3 text-left"
      >
        <CompletionSquare done={done} />
        <span className="min-w-0 flex-1">
          <StrikeLabel done={done} className="t-body">
            Daily cardio
          </StrikeLabel>
          <span className="t-micro mt-0.5 block text-frost-2">
            {k} KCAL / {mins} MIN / +15 XP
          </span>
        </span>
      </button>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="t-micro mb-1.5 text-frost-2">KCAL BURNED</p>
          <WeightStepper
            value={k}
            step={10}
            suffix="KCAL"
            max={3000}
            label="Calories burned"
            onChange={(v) => {
              setK(v);
              onDetails(v, mins);
            }}
          />
        </div>
        <div>
          <p className="t-micro mb-1.5 text-frost-2">MINUTES</p>
          <WeightStepper
            value={mins}
            step={5}
            suffix="MIN"
            max={600}
            label="Cardio minutes"
            onChange={(v) => {
              setMins(v);
              onDetails(k, v);
            }}
          />
        </div>
      </div>
    </div>
  );
}
