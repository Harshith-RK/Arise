"use client";


import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/system/Tabs";
import { Meter, Panel, Placeholder, Readout } from "@/components/system/primitives";
import { SystemWindow } from "@/components/system/SystemWindow";
import { IconForward, IconSupplies } from "@/components/icons";
import { useGame } from "@/lib/store/GameProvider";
import { DAY_TITLES, dayKeyOf, formatTime, weekStart, addDays } from "@/lib/engine/dates";
import { makePlanLookup, mealsFor, planTotals } from "@/lib/engine/day";
import { activeWorkoutPlan } from "@/lib/engine/rotation";
import type { DayKey } from "@/lib/engine/types";

export function LogScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get("tab") === "diet" ? "diet" : "workout";
  const setTab = (v: "workout" | "diet") => router.replace(`${pathname}?tab=${v}`, { scroll: false });

  return (
    <>
      <Tabs
        label="Log section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "workout", label: "Workout" },
          { value: "diet", label: "Diet" },
        ]}
      />
      {tab === "workout" ? <WorkoutTab /> : <DietTab />}
    </>
  );
}

function WorkoutTab() {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  if (!snapshot || !progress) return <Placeholder height={320} />;

  const plan = activeWorkoutPlan(snapshot, progress.today);
  const todayKeyName = dayKeyOf(progress.today);
  const restDays = snapshot.profile?.restDays ?? [];
  const monday = weekStart(progress.today);

  return (
    <div className="space-y-4">
      {(Object.keys(DAY_TITLES) as DayKey[]).map((day, i) => {
        const d = plan.days[day];
        const isToday = day === todayKeyName;
        const rest = restDays.includes(day);
        const date = addDays(monday, i);
        const result = progress.days[date];
        const exercises = (d?.exerciseIds ?? []).map((id) => plan.exercises[id]).filter(Boolean);

        const body = (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className={`t-title truncate ${isToday ? "text-ember" : "text-frost-0"}`}>
                  {rest ? "Rest" : (d?.title ?? "Rest")}
                </h2>
                <p className="t-micro mt-1 text-frost-2">
                  {DAY_TITLES[day].toUpperCase()}
                  {isToday ? " / TODAY" : ""}
                  {exercises.length ? ` / ${exercises.length} EXERCISES` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {result ? (
                  <span className="t-micro text-frost-2">
                    {result.exercisesDone}/{Math.max(1, result.exerciseTotal)}
                  </span>
                ) : null}
                <IconForward size={16} className="text-frost-2" />
              </div>
            </div>
            {exercises.length ? (
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {exercises.map((e) => (
                  <li key={e.id} className="t-micro text-frost-2">
                    {e.variants[0].name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-micro mt-3 text-glacier">STREAK BANKED. OPTIONAL BONUS QUEST.</p>
            )}
          </div>
        );

        return (
          <Link
            key={day}
            href={`/app/log/workout/${day}`}
            className={`pressable block transition-none hov:bg-ink-2 ${isToday ? "border border-ember bg-ink-1" : "surface-panel"}`}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}

function DietTab() {
  const snapshot = useGame((s) => s.snapshot);
  const progress = useGame((s) => s.progress);
  if (!snapshot || !progress) return <Placeholder height={320} />;

  const plans = makePlanLookup(snapshot.workoutPlans, snapshot.dietPlans);
  const log = snapshot.dayLogs.find((l) => l.date === progress.today);
  const plan = plans.diet(log?.dietPlanVersion);
  const today = progress.days[progress.today];
  const eaten = today?.eaten ?? { protein: 0, carbs: 0, fat: 0, kcal: 0 };
  const totals = planTotals(plan, progress.today);
  const todaysMeals = mealsFor(plan, progress.today);
  const profile = snapshot.profile;
  const kcalTarget = profile?.kcalTarget ?? totals.kcal;
  const proteinTarget = profile?.proteinTarget ?? totals.protein;

  // The calorie target is a training-day number. On a rest day there is no
  // ceiling to be over, so the row comes off rather than showing a figure that
  // does not apply. Meals still count, and the macros still have targets.
  const restDay = today?.isRest ?? false;
  const macros = [
    { key: "protein", label: "Protein", value: eaten.protein, target: proteinTarget, unit: "G", brassAtTarget: true },
    { key: "carbs", label: "Carbs", value: eaten.carbs, target: totals.carbs, unit: "G", brassAtTarget: false },
    { key: "fat", label: "Fat", value: eaten.fat, target: totals.fat, unit: "G", brassAtTarget: false },
    ...(restDay
      ? []
      : [{ key: "kcal", label: "Calories", value: eaten.kcal, target: kcalTarget, unit: "KCAL", brassAtTarget: false }]),
  ];

  return (
    <>
      {/* Focal: the macro instrument */}
      <SystemWindow className="mb-4" bodyClassName="px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="t-title text-frost-0">Today&apos;s intake</h2>
          <span className="t-micro text-frost-2">
            {today?.mealsEaten ?? 0} / {todaysMeals.length} MEALS
          </span>
        </div>
        <div className="space-y-3">
          {macros.map((m) => {
            const over = m.key === "kcal" && m.value > m.target;
            const hit = m.brassAtTarget && m.value >= m.target;
            const color = over ? "var(--fault)" : hit ? "var(--brass)" : "var(--ember)";
            return (
              <div key={m.key}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <Readout className="text-frost-1">{m.label}</Readout>
                  <span className="t-micro" style={{ color: over || hit ? color : "var(--frost-2)" }}>
                    {Math.round(m.value)} / {Math.round(m.target)} {m.unit}
                    {over ? " OVER" : hit ? " TARGET MET" : ""}
                  </span>
                </div>
                <Meter
                  value={Math.min(m.value, m.target)}
                  max={m.target}
                  cells={20}
                  height={8}
                  color={color}
                  label={`${m.label} today`}
                  valueText={`${Math.round(m.value)} of ${Math.round(m.target)} ${m.unit}`}
                />
              </div>
            );
          })}
        </div>
        {restDay ? (
          <p className="t-micro mt-4 border-t border-line-1 pt-3 text-frost-2">
            REST DAY. NO CALORIE TARGET TODAY. EAT THE PLAN AND CLEAR THE GATE.
          </p>
        ) : null}
      </SystemWindow>

      <Panel
        title="Meal plan"
        meta={`V${plan.version}`}
        action={
          <Link
            href="/app/log/diet/supplies"
            className="pressable t-micro flex h-11 items-center gap-2 whitespace-nowrap border border-line-2 px-3 text-frost-1 lg:h-9 transition-none hov:border-ember hov:text-ember"
          >
            <IconSupplies size={14} />
            SUPPLIES
          </Link>
        }
      >
        <ol className="border-t border-line-1">
          {todaysMeals.map((meal) => {
            const isEaten = !!log?.meals[meal.id]?.eaten;
            return (
              <li key={meal.id} className="row-rule relative flex gap-4 px-4 py-4">
                <div className="relative flex w-[56px] shrink-0 justify-end">
                  <span className="t-micro pt-0.5 text-frost-2">{formatTime(meal.time)}</span>
                </div>
                <span
                  className="absolute bottom-0 left-[76px] top-0 w-px bg-line-1"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 pl-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className={`t-body ${isEaten ? "text-frost-2" : "text-frost-0"}`}>{meal.name}</h3>
                    <span className="t-micro shrink-0 text-frost-2">{meal.kcal} KCAL</span>
                  </div>
                  <p className="t-micro mt-1 text-frost-2">
                    {meal.protein}P / {meal.carbs}C / {meal.fat}F
                  </p>
                  <p className="t-small mt-1.5 text-frost-1">{meal.items.join(", ")}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-line-1 px-4 py-3">
          <Link href="/app/system/plan/diet" className="t-micro text-ember hov:text-core">
            EDIT MEAL PLAN
          </Link>
        </div>
      </Panel>
    </>
  );
}
