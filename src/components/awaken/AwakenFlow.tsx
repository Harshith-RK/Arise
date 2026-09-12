"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, m } from "motion/react";
import { z } from "zod";
const BootSequence = dynamic(() => import("./BootSequence").then((m) => m.BootSequence), { ssr: false });
import { Field, Toggle } from "@/components/system/Field";
import { SystemWindow } from "@/components/system/SystemWindow";
import { Button } from "@/components/system/primitives";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES, todayKey } from "@/lib/engine/dates";
import { ProfileSchema, type DayKey, type Profile } from "@/lib/engine/types";
import { EASE } from "@/lib/motion";
import { estimateTdee } from "@/lib/engine/day";

const DRAFT_KEY = "wa:awaken-draft";
const STEPS = ["Identity", "Body scan", "Training", "Diet", "Confirm"] as const;

type Draft = {
  name: string;
  heightCm: string;
  startWeightKg: string;
  targetWeightKg: string;
  bodyFatPct: string;
  muscleKg: string;
  visceral: string;
  bmr: string;
  gymStart: string;
  gymEnd: string;
  restDays: DayKey[];
  vegetarian: boolean;
  noEggs: boolean;
  noWhey: boolean;
  kcalTarget: string;
  proteinTarget: string;
};

const INITIAL: Draft = {
  name: "Harshith RK",
  heightCm: "175.5",
  startWeightKg: "95.5",
  targetWeightKg: "72.7",
  bodyFatPct: "35.3",
  muscleKg: "34.9",
  visceral: "14",
  bmr: "1705",
  gymStart: "19:00",
  gymEnd: "21:00",
  restDays: ["sat", "sun"],
  vegetarian: true,
  noEggs: true,
  noWhey: true,
  kcalTarget: "2445",
  proteinTarget: "145",
};

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));

const STEP_SCHEMAS = [
  z.object({
    name: z.string().trim().min(1, "Enter a name").max(40),
    heightCm: z.number({ error: "Enter a height" }).min(100, "Too short").max(250, "Too tall"),
    startWeightKg: z.number({ error: "Enter your current weight" }).min(30).max(400),
    targetWeightKg: z.number({ error: "Enter a target weight" }).min(30).max(400),
  }),
  z.object({
    bodyFatPct: z.number().min(2).max(75).nullable(),
    muscleKg: z.number().min(5).max(150).nullable(),
    visceral: z.number().int().min(1).max(59).nullable(),
    bmr: z.number({ error: "Enter your BMR" }).int().min(800).max(5000),
  }),
  z.object({
    gymStart: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
    gymEnd: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  }),
  z.object({
    kcalTarget: z.number({ error: "Enter a calorie target" }).int().min(800).max(6000),
    proteinTarget: z.number({ error: "Enter a protein target" }).int().min(20).max(400),
  }),
  z.object({}),
];

export function AwakenFlow() {
  const router = useRouter();
  const status = useGame((s) => s.status);
  const { actions } = useGameActions();
  const [restored, setRestored] = useState<{ draft: Draft | null } | null>(null);
  const [step, setStep] = useState(0);
  // The System speaks once it has someone to speak to: the boot plays after
  // the profile is accepted, on the way to the first quest.
  const [awakening, setAwakening] = useState(false);
  const [edits, setEdits] = useState<Partial<Draft> | null>(null);
  const draft: Draft = useMemo(
    () => ({ ...INITIAL, ...(restored?.draft ?? {}), ...(edits ?? {}) }),
    [restored, edits],
  );
  const setDraft = (next: Draft | ((d: Draft) => Draft)) =>
    setEdits((prev) => {
      const base: Draft = { ...INITIAL, ...(restored?.draft ?? {}), ...(prev ?? {}) };
      return typeof next === "function" ? next(base) : next;
    });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scanSkipped, setScanSkipped] = useState(false);

  // Restore a part-finished awakening. This has to run after mount: the
  // server cannot read localStorage, and seeding it during render would
  // produce a hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount
      setRestored({ draft: { ...INITIAL, ...(JSON.parse(raw) as Partial<Draft>) } });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  // Already awakened: this route has nothing to do.
  useEffect(() => {
    if (status === "ready" && !awakening) router.replace("/app/quest");
  }, [status, router, awakening]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const parsedForStep = useMemo(() => {
    const values: Record<number, Record<string, unknown>> = {
      0: {
        name: draft.name,
        heightCm: num(draft.heightCm),
        startWeightKg: num(draft.startWeightKg),
        targetWeightKg: num(draft.targetWeightKg),
      },
      1: {
        bodyFatPct: draft.bodyFatPct.trim() === "" ? null : num(draft.bodyFatPct),
        muscleKg: draft.muscleKg.trim() === "" ? null : num(draft.muscleKg),
        visceral: draft.visceral.trim() === "" ? null : num(draft.visceral),
        bmr: num(draft.bmr),
      },
      2: { gymStart: draft.gymStart, gymEnd: draft.gymEnd },
      3: { kcalTarget: num(draft.kcalTarget), proteinTarget: num(draft.proteinTarget) },
      4: {},
    };
    return values[step];
  }, [draft, step]);

  const validateStep = (): boolean => {
    if (step === 1 && scanSkipped) return true;
    const result = STEP_SCHEMAS[step].safeParse(parsedForStep);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
    setErrors(next);
    return false;
  };

  const commit = async () => {
    const profile: Profile = {
      name: draft.name.trim(),
      heightCm: num(draft.heightCm),
      startWeightKg: num(draft.startWeightKg),
      targetWeightKg: num(draft.targetWeightKg),
      phase1TargetKg: Math.max(num(draft.targetWeightKg), Math.round((num(draft.startWeightKg) - 10) * 10) / 10),
      bodyFatPct: draft.bodyFatPct.trim() === "" ? null : num(draft.bodyFatPct),
      muscleKg: draft.muscleKg.trim() === "" ? null : num(draft.muscleKg),
      visceral: draft.visceral.trim() === "" ? null : Math.round(num(draft.visceral)),
      bmr: Math.round(num(draft.bmr)),
      gymStart: draft.gymStart,
      gymEnd: draft.gymEnd,
      restDays: draft.restDays,
      vegetarian: draft.vegetarian,
      noEggs: draft.noEggs,
      noWhey: draft.noWhey,
      kcalTarget: Math.round(num(draft.kcalTarget)),
      proteinTarget: Math.round(num(draft.proteinTarget)),
      arcStart: todayKey(),
      arcLength: 90,
      createdAt: new Date().toISOString(),
    };
    const parsed = ProfileSchema.safeParse(profile);
    if (!parsed.success) {
      setErrors({ name: parsed.error.issues[0]?.message ?? "Something is missing." });
      setStep(0);
      return;
    }
    setAwakening(true);
    await actions.completeOnboarding(parsed.data);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const next = () => {
    if (!validateStep()) return;
    if (step === STEPS.length - 1) void commit();
    else setStep((s) => s + 1);
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col justify-center px-4 py-10">
      <AnimatePresence>
        {awakening ? (
          <BootSequence
            key="boot"
            name={draft.name.trim()}
            onDone={() => router.replace("/app/quest")}
          />
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

        <form
          className="mt-6"
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
                  <Field label="HUNTER NAME" value={draft.name} onChange={(v) => set("name", v)} error={errors.name} autoFocus />
                  <Field
                    label="HEIGHT"
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    suffix="CM"
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
                    InBody-style readings from your last scan. You can skip this and add it at your first weigh-in.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="BODY FAT"
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      suffix="%"
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
                      value={draft.muscleKg}
                      onChange={(v) => set("muscleKg", v)}
                      error={errors.muscleKg}
                    />
                    <Field
                      label="VISCERAL FAT"
                      type="number"
                      inputMode="numeric"
                      value={draft.visceral}
                      onChange={(v) => set("visceral", v)}
                      error={errors.visceral}
                      helper="Safe zone is under 10."
                    />
                    <Field
                      label="BMR"
                      type="number"
                      inputMode="numeric"
                      suffix="KCAL"
                      value={draft.bmr}
                      onChange={(v) => set("bmr", v)}
                      error={errors.bmr}
                    />
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="GYM FROM" type="time" value={draft.gymStart} onChange={(v) => set("gymStart", v)} error={errors.gymStart} />
                    <Field label="GYM UNTIL" type="time" value={draft.gymEnd} onChange={(v) => set("gymEnd", v)} error={errors.gymEnd} />
                  </div>
                  <div>
                    <p className="t-micro mb-2 text-frost-2">REST DAYS</p>
                    <div className="grid grid-cols-7 gap-1">
                      {(Object.keys(DAY_TITLES) as DayKey[]).map((d) => {
                        const on = draft.restDays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              set("restDays", on ? draft.restDays.filter((x) => x !== d) : [...draft.restDays, d])
                            }
                            className="pressable t-micro h-12 border border-line-2 text-frost-2 transition-none aria-pressed:border-glacier aria-pressed:bg-ink-3 aria-pressed:text-glacier"
                          >
                            {d.slice(0, 1).toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    <p className="t-micro mt-2 text-frost-2">Rest days bank your workout streak instead of breaking it.</p>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Toggle label="Vegetarian" checked={draft.vegetarian} onChange={(v) => set("vegetarian", v)} />
                  <Toggle label="No eggs" checked={draft.noEggs} onChange={(v) => set("noEggs", v)} />
                  <Toggle label="No whey" checked={draft.noWhey} onChange={(v) => set("noWhey", v)} helper="Protein comes from dairy and legumes instead." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="CALORIE TARGET"
                      type="number"
                      inputMode="numeric"
                      suffix="KCAL"
                      value={draft.kcalTarget}
                      onChange={(v) => set("kcalTarget", v)}
                      error={errors.kcalTarget}
                      helper="Training days only."
                    />
                    <Field
                      label="PROTEIN TARGET"
                      type="number"
                      inputMode="numeric"
                      suffix="G"
                      value={draft.proteinTarget}
                      onChange={(v) => set("proteinTarget", v)}
                      error={errors.proteinTarget}
                    />
                  </div>
                  <p className="t-micro text-frost-2">
                    Your planned meals total 2445 kcal and 145 g protein. Set the target to match the plan, or lower it to
                    push a deficit.
                  </p>
                </>
              ) : null}

              {step === 4 ? <Summary draft={draft} /> : null}
            </m.div>
          </AnimatePresence>

          <div className="mt-7 flex items-center gap-3">
            {step > 0 ? (
              <Button type="button" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            {step === 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setScanSkipped(true);
                  setDraft((d) => ({ ...d, bodyFatPct: "", muscleKg: "", visceral: "" }));
                  setErrors({});
                  setStep(2);
                }}
              >
                Skip scan
              </Button>
            ) : null}
            <Button type="submit" variant="primary" className="ml-auto">
              {step === STEPS.length - 1 ? "Accept the System" : "Next"}
            </Button>
          </div>
        </form>
      </SystemWindow>

      <p className="t-micro mt-6 text-center text-frost-2">
        EVERYTHING HERE IS EDITABLE LATER IN SYSTEM
      </p>
    </main>
  );
}

function Summary({ draft }: { draft: Draft }) {
  const bmi = num(draft.startWeightKg) / (num(draft.heightCm) / 100) ** 2;
  const tdee = estimateTdee(num(draft.bmr));
  const deficit = tdee - num(draft.kcalTarget);
  const rows: [string, string][] = [
    ["HUNTER", draft.name],
    ["HEIGHT", `${draft.heightCm} CM`],
    ["START WEIGHT", `${draft.startWeightKg} KG`],
    ["TARGET WEIGHT", `${draft.targetWeightKg} KG`],
    ["BMI", Number.isFinite(bmi) ? bmi.toFixed(1) : "-"],
    ["GYM WINDOW", `${draft.gymStart} TO ${draft.gymEnd}`],
    ["REST DAYS", draft.restDays.length ? draft.restDays.map((d) => d.toUpperCase()).join(" ") : "NONE"],
    ["TRAINING DAY INTAKE", `${draft.kcalTarget} KCAL / ${draft.proteinTarget} G PROTEIN`],
    ["ESTIMATED TDEE", `${tdee} KCAL`],
    ["TRAINING DAY DEFICIT", `${deficit} KCAL`],
  ];
  return (
    <div>
      <dl className="divide-y divide-line-1 border-y border-line-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="t-micro text-frost-2">{k}</dt>
            <dd className="t-readout text-right text-frost-0">{v}</dd>
          </div>
        ))}
      </dl>
      {deficit < 250 ? (
        <p className="t-micro mt-4 border border-glacier px-3 py-2 text-glacier">
          At this intake your deficit is {deficit} kcal per day. Fat loss will be slow. Lower the calorie target if you
          want a faster arc.
        </p>
      ) : null}
      <p className="t-small mt-4 text-frost-1">
        The arc starts today and runs 90 days. Accept to begin.
      </p>
    </div>
  );
}
