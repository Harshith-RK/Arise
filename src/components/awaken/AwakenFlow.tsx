"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, m } from "motion/react";
import { z } from "zod";
const BootSequence = dynamic(() => import("./BootSequence").then((m) => m.BootSequence), { ssr: false });
import { Field } from "@/components/system/Field";
import { Choice, MultiChoice } from "@/components/system/Choice";
import { PlanReadout } from "@/components/plan/PlanReadout";
import { PlanPreview } from "@/components/plan/PlanPreview";
import { SignedInAs } from "@/components/auth/SignedInAs";
import { SystemWindow } from "@/components/system/SystemWindow";
import { Button } from "@/components/system/primitives";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES, timeToMinutes, todayKey } from "@/lib/engine/dates";
import { ProfileSchema, SETUP_VERSION, type DayKey, type Profile } from "@/lib/engine/types";
import { EASE } from "@/lib/motion";
import { buildPlans } from "@/lib/plan/build";
import { body, type Condition, type Equipment, type Experience, type Injury, type Sex } from "@/lib/plan/rules";
import { planTargets } from "@/lib/plan/targets";
import { goalFor, trainingDays } from "@/lib/plan/from-profile";
import { usePlanModel } from "@/lib/plan/use-plan-model";
import { draftKey, useAuth } from "@/lib/supabase/session";
import {
  CONDITION_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FEMALE_ONLY_CONDITIONS,
  INJURY_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/plan/options";

const STEPS = ["Identity", "Body scan", "Training", "Diet"] as const;

type DietType = "vegetarian" | "eggetarian" | "nonveg";

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: "vegetarian", label: "VEGETARIAN" },
  { value: "eggetarian", label: "VEG + EGGS" },
  { value: "nonveg", label: "NON-VEG" },
];
const WHEY_OPTIONS: { value: "yes" | "no"; label: string }[] = [
  { value: "yes", label: "YES" },
  { value: "no", label: "NO" },
];

type Draft = {
  name: string;
  sex: Sex | "";
  age: string;
  heightCm: string;
  startWeightKg: string;
  targetWeightKg: string;
  bodyFatPct: string;
  muscleKg: string;
  visceral: string;
  noScan: boolean;
  gymStart: string;
  gymEnd: string;
  restDays: DayKey[];
  experience: Experience | "";
  equipment: Equipment | "";
  injuries: Injury[];
  diet: DietType | "";
  whey: "yes" | "no" | "";
  conditions: Condition[];
  /** Blank means "use what the System calculated". */
  kcalOverride: string;
  proteinOverride: string;
};

/**
 * Nothing is pre-filled. Every answer that shapes the plan is one the Hunter
 * gives on purpose: a default is a guess about a stranger's body and diet, and
 * pressing Next through defaults is how someone ends up with another person's plan.
 */
const EMPTY: Draft = {
  name: "",
  sex: "",
  age: "",
  heightCm: "",
  startWeightKg: "",
  targetWeightKg: "",
  bodyFatPct: "",
  muscleKg: "",
  visceral: "",
  noScan: false,
  gymStart: "",
  gymEnd: "",
  restDays: [],
  experience: "",
  equipment: "",
  injuries: [],
  diet: "",
  whey: "",
  conditions: [],
  kcalOverride: "",
  proteinOverride: "",
};

/** Keep only fields a saved draft stored with the type this version expects. */
function sanitize(raw: unknown): Partial<Draft> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Draft> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in EMPTY)) continue;
    const expected = EMPTY[k as keyof Draft];
    if (Array.isArray(expected) ? Array.isArray(v) : typeof v === typeof expected) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));
const opt = (v: string) => (v.trim() === "" ? null : num(v));

const dietPrefs = (diet: DietType, whey: "yes" | "no") => ({
  vegetarian: diet !== "nonveg",
  noEggs: diet === "vegetarian",
  noWhey: whey === "no",
});

const STEP_SCHEMAS = [
  z.object({
    name: z.string().trim().min(1, "Enter your name").max(40),
    sex: z.enum(["male", "female"], { error: "Choose one. It changes how BMR is calculated." }),
    age: z.number({ error: "Enter your age" }).int("Whole years").min(10, "Enter your age").max(100, "Enter your age"),
    heightCm: z.number({ error: "Enter your height" }).min(100, "Too short").max(250, "Too tall"),
    startWeightKg: z.number({ error: "Enter your current weight" }).min(30, "At least 30 kg").max(400, "At most 400 kg"),
    targetWeightKg: z.number({ error: "Enter a target weight" }).min(30, "At least 30 kg").max(400, "At most 400 kg"),
  }),
  z.object({
    bodyFatPct: z.number({ error: "Enter a number" }).min(2, "At least 2%").max(75, "At most 75%").nullable(),
    muscleKg: z.number({ error: "Enter a number" }).min(5).max(150).nullable(),
    visceral: z.number({ error: "Enter a number" }).int("Whole number").min(1).max(59).nullable(),
  }),
  z.object({
    gymStart: z.string().regex(/^\d{2}:\d{2}$/, "Enter when you start"),
    gymEnd: z.string().regex(/^\d{2}:\d{2}$/, "Enter when you finish"),
    restDays: z.array(z.string()).min(1, "Pick your rest days, one to four").max(4, "Four rest days at most"),
    experience: z.enum(["beginner", "intermediate", "advanced"], { error: "Choose one" }),
    equipment: z.enum(["none", "dumbbell", "gym", "full"], { error: "Choose what you train with" }),
  }),
  z.object({
    diet: z.enum(["vegetarian", "eggetarian", "nonveg"], { error: "Choose how you eat" }),
    whey: z.enum(["yes", "no"], { error: "Choose one" }),
  }),
];

const OVERRIDE_SCHEMA = z.object({
  kcalOverride: z.number().int("Whole kcal").min(800, "At least 800").max(6000, "At most 6000").nullable(),
  proteinOverride: z.number().int("Whole grams").min(20, "At least 20").max(400, "At most 400").nullable(),
});

type Phase = "form" | "boot" | "plan";

export function AwakenFlow() {
  const router = useRouter();
  const status = useGame((s) => s.status);
  const existing = useGame((s) => s.snapshot?.profile ?? null);
  const { actions } = useGameActions();
  const auth = useAuth();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [committing, setCommitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A part-finished onboarding is kept per account, so a second person signing
  // up on this device never sees the first person's answers.
  const accountId = auth.status === "signed-in" ? auth.userId : null;
  const key = auth.status === "loading" ? null : draftKey(accountId);
  const [restored, setRestored] = useState<{ key: string; draft: Partial<Draft> } | null>(null);
  const [edits, setEdits] = useState<Partial<Draft>>({});

  // Google supplies a name, the one thing worth pre-filling: it is the Hunter's
  // own, and they can change it.
  const accountName = auth.status === "signed-in" ? (auth.name ?? "") : "";
  const draft: Draft = useMemo(() => {
    const saved = restored?.key === key ? restored.draft : {};
    const merged = { ...EMPTY, name: accountName, ...saved, ...edits };
    if (!merged.name) merged.name = accountName;
    return merged;
  }, [restored, key, edits, accountName]);

  useEffect(() => {
    if (!key) return;
    try {
      // The old unscoped draft was filled from one person's defaults. Drop it.
      localStorage.removeItem("wa:awaken-draft");
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state once the account is known
      setRestored({ key, draft: raw ? sanitize(JSON.parse(raw)) : {} });
    } catch {
      setRestored({ key, draft: {} });
    }
  }, [key]);

  useEffect(() => {
    // Only after the saved draft was read, or an empty form would overwrite it.
    if (!key || restored?.key !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [draft, key, restored]);

  // Already set up: this route has nothing to do.
  useEffect(() => {
    if (status === "ready" && !committing) router.replace("/app/quest");
  }, [status, router, committing]);

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setEdits((prev) => ({ ...prev, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const values: Record<number, Record<string, unknown>> = {
    0: {
      name: draft.name,
      sex: draft.sex || undefined,
      age: num(draft.age),
      heightCm: num(draft.heightCm),
      startWeightKg: num(draft.startWeightKg),
      targetWeightKg: num(draft.targetWeightKg),
    },
    1: { bodyFatPct: opt(draft.bodyFatPct), muscleKg: opt(draft.muscleKg), visceral: opt(draft.visceral) },
    2: {
      gymStart: draft.gymStart,
      gymEnd: draft.gymEnd,
      restDays: draft.restDays,
      experience: draft.experience || undefined,
      equipment: draft.equipment || undefined,
    },
    3: { diet: draft.diet || undefined, whey: draft.whey || undefined },
  };

  const validateStep = (): boolean => {
    const result = STEP_SCHEMAS[step].safeParse(values[step]);
    const next: Record<string, string> = {};
    if (!result.success) for (const issue of result.error.issues) next[String(issue.path[0])] ??= issue.message;

    // A scan is optional, but skipping it is a choice, not an empty box.
    if (step === 1 && !draft.noScan && draft.bodyFatPct.trim() === "") {
      next.bodyFatPct = "Enter your body fat, or choose I don't have a scan";
    }
    if (step === 2 && !next.gymStart && !next.gymEnd && timeToMinutes(draft.gymEnd) <= timeToMinutes(draft.gymStart)) {
      next.gymEnd = "Finish after you start";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Everything below needs every step answered, which is true by the time the
  // plan phase is reachable.
  const model = usePlanModel();
  const planInput = useMemo(() => {
    const age = num(draft.age);
    const heightCm = num(draft.heightCm);
    const weightKg = num(draft.startWeightKg);
    const targetKg = num(draft.targetWeightKg);
    if (!draft.sex || !draft.experience || !draft.equipment) return null;
    if (![age, heightCm, weightKg, targetKg].every(Number.isFinite)) return null;
    const bf = draft.noScan ? null : opt(draft.bodyFatPct);
    return {
      weightKg,
      heightCm,
      age,
      sex: draft.sex,
      bodyFatPct: bf !== null && Number.isFinite(bf) ? bf : null,
      days: trainingDays(draft.restDays),
      goal: goalFor(weightKg, targetKg),
      experience: draft.experience,
      equipment: draft.equipment,
      conditions: draft.conditions.filter((c) => draft.sex === "female" || !FEMALE_ONLY_CONDITIONS.has(c)),
      injuries: draft.injuries,
    };
  }, [draft]);
  const plan = useMemo(() => (planInput ? planTargets(planInput, model) : null), [planInput, model]);

  const override = {
    kcal: draft.kcalOverride.trim() === "" ? null : Math.round(num(draft.kcalOverride)),
    proteinG: draft.proteinOverride.trim() === "" ? null : Math.round(num(draft.proteinOverride)),
  };

  // The meal and training plans. Built only once the System has spoken, since
  // generation is the slowest thing on this screen.
  const built = useMemo(() => {
    if (phase !== "plan" || !planInput || !plan || !draft.diet || !draft.whey) return null;
    const valid = (v: number | null, lo: number, hi: number) => v === null || (Number.isFinite(v) && v >= lo && v <= hi);
    if (!valid(override.kcal, 800, 6000) || !valid(override.proteinG, 20, 400)) return null;
    return buildPlans(
      {
        ...planInput,
        restDays: draft.restDays,
        gymStart: draft.gymStart,
        gymEnd: draft.gymEnd,
        ...dietPrefs(draft.diet, draft.whey),
      },
      plan,
      override,
    );
    // override is derived from draft, which is already a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, planInput, plan, draft]);

  const next = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else setPhase("boot");
  };

  const commit = async () => {
    if (committing || !planInput || !plan || !draft.diet || !draft.whey) return;

    const parsedOverride = OVERRIDE_SCHEMA.safeParse({
      kcalOverride: override.kcal,
      proteinOverride: override.proteinG,
    });
    const problems: Record<string, string> = {};
    if (!parsedOverride.success) for (const i of parsedOverride.error.issues) problems[String(i.path[0])] ??= i.message;
    // With no calculated targets (a refusal), the Hunter's own numbers are the
    // only ones there are, so they stop being optional.
    if (plan.refused) {
      if (override.kcal === null) problems.kcalOverride = "Enter the target your clinician gave you";
      if (override.proteinG === null) problems.proteinOverride = "Enter the target your clinician gave you";
    }
    if (Object.keys(problems).length) {
      setErrors(problems);
      return;
    }

    const calculated = plan.refused ? null : plan;
    const manual = override.kcal !== null || override.proteinG !== null;
    const profile: Profile = {
      name: draft.name.trim(),
      sex: planInput.sex,
      age: planInput.age,
      experience: planInput.experience,
      equipment: planInput.equipment,
      conditions: planInput.conditions,
      injuries: draft.injuries,
      targetSource: manual || !calculated ? "manual" : calculated.source,
      setupVersion: SETUP_VERSION,
      heightCm: planInput.heightCm,
      startWeightKg: planInput.weightKg,
      targetWeightKg: num(draft.targetWeightKg),
      phase1TargetKg: Math.max(num(draft.targetWeightKg), Math.round((planInput.weightKg - 10) * 10) / 10),
      bodyFatPct: planInput.bodyFatPct,
      muscleKg: draft.noScan ? null : opt(draft.muscleKg),
      visceral: draft.noScan ? null : (opt(draft.visceral) === null ? null : Math.round(num(draft.visceral))),
      bmr: Math.min(5000, Math.max(800, Math.round(body(planInput).bmr))),
      gymStart: draft.gymStart,
      gymEnd: draft.gymEnd,
      restDays: draft.restDays,
      ...dietPrefs(draft.diet, draft.whey),
      kcalTarget: override.kcal ?? calculated?.kcal ?? 2000,
      proteinTarget: override.proteinG ?? calculated?.proteinG ?? 100,
      // Setting up starts the arc, including for a Hunter setting up again: day 1
      // is today, and nothing logged before it counts toward their progress.
      arcStart: todayKey(),
      arcLength: existing?.arcLength ?? null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const parsed = ProfileSchema.safeParse(profile);
    if (!parsed.success) {
      setErrors({ name: parsed.error.issues[0]?.message ?? "Something is missing." });
      setPhase("form");
      setStep(0);
      return;
    }

    setCommitting(true);
    await actions.completeOnboarding(
      parsed.data,
      built ? { workout: built.workout, diet: built.diet, supplies: built.supplies } : undefined,
    );
    try {
      if (key) localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
    router.replace("/app/quest");
  };

  if (phase === "plan") {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col justify-center px-4 py-10">
        <SystemWindow bodyClassName="px-5 py-6 sm:px-7 sm:py-8">
          <p className="t-micro text-ember">THE SYSTEM HAS ISSUED YOUR PLAN</p>
          <h1 className="t-title mt-1 text-frost-0">{draft.name.trim()}</h1>
          <p className="t-micro mt-1 text-frost-2">
            {draft.age} YRS / {draft.heightCm} CM / {draft.startWeightKg} TO {draft.targetWeightKg} KG /{" "}
            {trainingDays(draft.restDays)} TRAINING DAYS
          </p>

          <div className="mt-6 space-y-5">
            {plan ? <PlanReadout plan={plan} /> : null}

            <div>
              <p className="t-micro text-frost-2">
                {plan?.refused ? "YOUR TARGETS" : "OVERRIDE, OR LEAVE BLANK TO USE THE CALCULATION"}
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <Field
                  label="CALORIES"
                  type="number"
                  inputMode="numeric"
                  suffix="KCAL"
                  placeholder={plan && !plan.refused ? String(plan.kcal) : ""}
                  value={draft.kcalOverride}
                  onChange={(v) => set("kcalOverride", v)}
                  error={errors.kcalOverride}
                />
                <Field
                  label="PROTEIN"
                  type="number"
                  inputMode="numeric"
                  suffix="G"
                  placeholder={plan && !plan.refused ? String(plan.proteinG) : ""}
                  value={draft.proteinOverride}
                  onChange={(v) => set("proteinOverride", v)}
                  error={errors.proteinOverride}
                />
              </div>
            </div>

            {built ? (
              <PlanPreview plans={built} />
            ) : plan?.refused ? null : (
              <p className="t-micro text-frost-2">PLANS ARE BUILT ONCE THE TARGETS ABOVE ARE VALID.</p>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={committing}
              onClick={() => {
                setPhase("form");
                setStep(0);
              }}
            >
              Change my answers
            </Button>
            <Button type="button" variant="primary" className="ml-auto" disabled={committing} onClick={() => void commit()}>
              {committing ? "Starting" : "Use this plan"}
            </Button>
          </div>
        </SystemWindow>
        <p className="t-micro mt-6 text-center text-frost-2">EVERYTHING HERE IS EDITABLE LATER IN SYSTEM</p>
        <SignedInAs className="mt-3 text-center" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col justify-center px-4 py-10">
      <AnimatePresence>
        {phase === "boot" ? (
          <BootSequence key="boot" name={draft.name.trim()} onDone={() => setPhase("plan")} />
        ) : null}
      </AnimatePresence>

      <SystemWindow bodyClassName="px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="t-title text-frost-0">{STEPS[step]}</h1>
          <span className="t-micro text-frost-2">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Segmented step meter */}
        <div className="mt-3 flex gap-1" role="presentation">
          {STEPS.map((s, i) => (
            <span key={s} className="h-1 flex-1" style={{ background: i <= step ? "var(--ember)" : "var(--ink-3)" }} />
          ))}
        </div>

        {existing && step === 0 ? (
          <p className="t-micro mt-5 border border-line-2 px-3 py-2 text-frost-1">
            THE SYSTEM NEEDS YOUR DETAILS FROM THE START. YOUR ARC BEGINS AGAIN AT DAY 1.
          </p>
        ) : null}

        <form
          className="mt-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE.out }}
              className="space-y-4"
            >
              {step === 0 ? (
                <>
                  <Field
                    label="HUNTER NAME"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={draft.name}
                    onChange={(v) => set("name", v)}
                    error={errors.name}
                    autoFocus
                  />
                  <div className="grid grid-cols-[1fr_7rem] gap-3">
                    <Choice
                      label="SEX"
                      value={draft.sex || null}
                      options={SEX_OPTIONS}
                      onChange={(v) => set("sex", v)}
                      error={errors.sex}
                    />
                    <Field
                      label="AGE"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 25"
                      value={draft.age}
                      onChange={(v) => set("age", v)}
                      error={errors.age}
                    />
                  </div>
                  <Field
                    label="HEIGHT"
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    suffix="CM"
                    placeholder="e.g. 170"
                    value={draft.heightCm}
                    onChange={(v) => set("heightCm", v)}
                    error={errors.heightCm}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="CURRENT WEIGHT"
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      suffix="KG"
                      placeholder="e.g. 80"
                      value={draft.startWeightKg}
                      onChange={(v) => set("startWeightKg", v)}
                      error={errors.startWeightKg}
                    />
                    <Field
                      label="TARGET WEIGHT"
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      suffix="KG"
                      placeholder="e.g. 72"
                      value={draft.targetWeightKg}
                      onChange={(v) => set("targetWeightKg", v)}
                      error={errors.targetWeightKg}
                    />
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <p className="t-small text-frost-1">
                    Readings from a body composition scan, such as InBody. Body fat makes every calculated number more
                    accurate.
                  </p>
                  {draft.noScan ? (
                    <div className="border border-line-2 px-3 py-3">
                      <p className="t-small text-frost-1">No scan. Body fat will be estimated from your BMI.</p>
                      <button
                        type="button"
                        onClick={() => set("noScan", false)}
                        className="pressable t-micro mt-2 text-ember underline underline-offset-4 transition-none"
                      >
                        I HAVE A SCAN AFTER ALL
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="BODY FAT"
                        type="number"
                        inputMode="decimal"
                        step={0.1}
                        suffix="%"
                        placeholder="e.g. 22"
                        value={draft.bodyFatPct}
                        onChange={(v) => set("bodyFatPct", v)}
                        error={errors.bodyFatPct}
                      />
                      <Field
                        label="SKELETAL MUSCLE"
                        type="number"
                        inputMode="decimal"
                        step={0.1}
                        suffix="KG"
                        placeholder="Optional"
                        value={draft.muscleKg}
                        onChange={(v) => set("muscleKg", v)}
                        error={errors.muscleKg}
                      />
                      <Field
                        label="VISCERAL FAT"
                        type="number"
                        inputMode="numeric"
                        placeholder="Optional"
                        value={draft.visceral}
                        onChange={(v) => set("visceral", v)}
                        error={errors.visceral}
                        helper="Safe zone is under 10."
                      />
                    </div>
                  )}
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="GYM FROM" type="time" value={draft.gymStart} onChange={(v) => set("gymStart", v)} error={errors.gymStart} />
                    <Field label="GYM UNTIL" type="time" value={draft.gymEnd} onChange={(v) => set("gymEnd", v)} error={errors.gymEnd} />
                  </div>
                  <div role="group" aria-label="REST DAYS">
                    <p className="t-micro mb-2 text-frost-2">REST DAYS</p>
                    <div className="grid grid-cols-4 gap-1 min-[400px]:grid-cols-7">
                      {(Object.keys(DAY_TITLES) as DayKey[]).map((d) => {
                        const on = draft.restDays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${DAY_TITLES[d]} is a rest day`}
                            onClick={() =>
                              set("restDays", on ? draft.restDays.filter((x) => x !== d) : [...draft.restDays, d])
                            }
                            className="pressable t-micro h-12 border border-line-2 text-frost-2 transition-none aria-pressed:border-glacier aria-pressed:bg-ink-3 aria-pressed:text-glacier"
                          >
                            {d.slice(0, 3).toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    {errors.restDays ? (
                      <p className="t-micro mt-2 text-fault">{errors.restDays}</p>
                    ) : (
                      <p className="t-micro mt-2 text-frost-2">Rest days bank your workout streak instead of breaking it.</p>
                    )}
                  </div>
                  <Choice
                    label="TRAINING EXPERIENCE"
                    value={draft.experience || null}
                    options={EXPERIENCE_OPTIONS}
                    onChange={(v) => set("experience", v)}
                    error={errors.experience}
                    helper="Sets your starting weekly volume."
                  />
                  <Choice
                    label="EQUIPMENT"
                    value={draft.equipment || null}
                    options={EQUIPMENT_OPTIONS}
                    onChange={(v) => set("equipment", v)}
                    error={errors.equipment}
                  />
                  <MultiChoice
                    label="INJURIES TO WORK AROUND"
                    value={draft.injuries}
                    options={INJURY_OPTIONS}
                    onChange={(v) => set("injuries", v)}
                    helper="Leave empty if none. Volume for an injured area drops instead of stopping."
                  />
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Choice
                    label="HOW YOU EAT"
                    value={draft.diet || null}
                    options={DIET_OPTIONS}
                    onChange={(v) => set("diet", v)}
                    error={errors.diet}
                  />
                  <Choice
                    label="WHEY PROTEIN"
                    value={draft.whey || null}
                    options={WHEY_OPTIONS}
                    onChange={(v) => set("whey", v)}
                    error={errors.whey}
                    helper="Without whey, protein comes from dairy, legumes, eggs or meat instead."
                  />
                  <MultiChoice
                    label="HEALTH CONDITIONS"
                    value={draft.conditions}
                    options={CONDITION_OPTIONS.filter((o) => draft.sex === "female" || !FEMALE_ONLY_CONDITIONS.has(o.value))}
                    onChange={(v) => set("conditions", v)}
                    helper="Leave empty if none. Some adjust your targets; for a few the System will not set targets and says why."
                  />
                </>
              ) : null}
            </m.div>
          </AnimatePresence>

          <div className="mt-7 flex items-center gap-3">
            {step > 0 ? (
              <Button type="button" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            {step === 1 && !draft.noScan ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEdits((prev) => ({ ...prev, noScan: true, bodyFatPct: "", muscleKg: "", visceral: "" }));
                  setErrors({});
                  setStep(2);
                }}
              >
                I don&apos;t have a scan
              </Button>
            ) : null}
            <Button type="submit" variant="primary" className="ml-auto">
              {step === STEPS.length - 1 ? "Awaken" : "Next"}
            </Button>
          </div>
        </form>
      </SystemWindow>

      <p className="t-micro mt-6 text-center text-frost-2">EVERYTHING HERE IS EDITABLE LATER IN SYSTEM</p>
      <SignedInAs className="mt-3 text-center" />
    </main>
  );
}
