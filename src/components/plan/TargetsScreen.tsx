"use client";

import { useMemo, useState } from "react";
import { Button, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { Choice, MultiChoice } from "@/components/system/Choice";
import { Field } from "@/components/system/Field";
import { notify } from "@/components/system/notify";
import { PlanReadout } from "./PlanReadout";
import { PlanPreview } from "./PlanPreview";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { ProfileSchema, type Profile } from "@/lib/engine/types";
import { body } from "@/lib/plan/rules";
import { planTargets } from "@/lib/plan/targets";
import { buildPlans, type BuiltPlans } from "@/lib/plan/build";
import { missingForPlan, planInputFromProfile } from "@/lib/plan/from-profile";
import { usePlanModel } from "@/lib/plan/use-plan-model";
import {
  CONDITION_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  FEMALE_ONLY_CONDITIONS,
  INJURY_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/plan/options";

/**
 * Targets and plans, on their own page. The System screen only shows the two
 * numbers and a way here. On this page each job is its own section: the numbers,
 * the plans built from them, and the details they are calculated from.
 */
export function TargetsScreen() {
  const snapshot = useGame((s) => s.snapshot);
  const latestWeight = useGame((s) => s.progress?.latestWeighIn?.weightKg ?? null);
  const { actions, dispatch } = useGameActions();
  const model = usePlanModel();

  const profile = snapshot?.profile ?? null;
  const currentWeightKg = latestWeight ?? profile?.startWeightKg ?? 0;
  const input = useMemo(() => (profile ? planInputFromProfile(profile, currentWeightKg) : null), [profile, currentWeightKg]);
  const plan = useMemo(() => (input ? planTargets(input, model) : null), [input, model]);
  const [preview, setPreview] = useState<BuiltPlans | null>(null);
  const [busy, setBusy] = useState(false);

  if (!snapshot || !profile) return <Placeholder height={320} />;

  const save = async (patch: Partial<Profile>) => {
    const parsed = ProfileSchema.safeParse({ ...profile, ...patch });
    if (!parsed.success) {
      notify({ tag: "Warning", text: parsed.error.issues[0]?.message ?? "That value is out of range.", tone: "fault" });
      return;
    }
    dispatch(await actions.saveProfile(parsed.data));
  };

  const missing = missingForPlan({ sex: profile.sex ?? null, age: profile.age ?? null });
  const applied = plan && !plan.refused && plan.kcal === profile.kcalTarget && plan.proteinG === profile.proteinTarget;

  const details = <DetailsPanel profile={profile} save={save} highlight={missing.length > 0} />;

  return (
    <>
      <PageHeader title="Targets" />

      {/* Without sex and age there is nothing to calculate, so the details come first. */}
      {missing.length ? details : null}

      <Panel title="Your targets" className="mb-4">
        <div className="space-y-4 border-t border-line-1 px-4 py-4">
          {missing.length ? (
            <p className="t-micro text-frost-1">ADD YOUR {missing.join(" AND ").toUpperCase()} BELOW TO CALCULATE THEM.</p>
          ) : plan ? (
            <>
              <PlanReadout plan={plan} />
              {plan.refused ? null : (
                <div>
                  <Button
                    variant="primary"
                    className="w-full sm:w-auto"
                    disabled={!!applied}
                    onClick={() =>
                      void save({
                        kcalTarget: plan.kcal,
                        proteinTarget: plan.proteinG,
                        bmr: Math.min(5000, Math.max(800, Math.round(input ? body(input).bmr : profile.bmr))),
                        targetSource: plan.source,
                      })
                    }
                  >
                    {applied ? "In use" : "Use these targets"}
                  </Button>
                  <p className="t-micro mt-2 text-frost-2">
                    {applied
                      ? `CALCULATED AT ${currentWeightKg.toFixed(1)} KG, YOUR LATEST READING.`
                      : `YOU ARE ON ${profile.kcalTarget} KCAL / ${profile.proteinTarget} G${
                          profile.targetSource === "manual" || !profile.targetSource ? ", SET BY HAND" : ""
                        }.`}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </Panel>

      {missing.length ? null : (
        <Panel title="Meal and training plans" className="mb-4">
          <div className="border-t border-line-1 px-4 py-4">
            {preview ? (
              <div className="space-y-3">
                <PlanPreview plans={preview} />
                <p className="t-micro text-frost-2">
                  REPLACES YOUR MEAL PLAN, TRAINING PLAN AND SUPPLIES. DAYS ALREADY LOGGED KEEP THEIR PLAN.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      dispatch(await actions.saveWorkoutPlan(preview.workout));
                      dispatch(await actions.saveDietPlan(preview.diet));
                      await actions.saveSupplies({ weekOf: snapshot.supplies.weekOf, items: preview.supplies });
                      setPreview(null);
                      setBusy(false);
                    }}
                  >
                    Use these plans
                  </Button>
                  <Button onClick={() => setPreview(null)} disabled={busy}>
                    Keep my current plans
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="t-small text-frost-1">
                  A week of meals and training built from {profile.kcalTarget} kcal and {profile.proteinTarget} g protein.
                </p>
                <Button
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => {
                    if (!input || !plan) return;
                    setPreview(
                      buildPlans(
                        {
                          ...input,
                          restDays: profile.restDays,
                          gymStart: profile.gymStart,
                          gymEnd: profile.gymEnd,
                          vegetarian: profile.vegetarian,
                          noEggs: profile.noEggs,
                          noWhey: profile.noWhey,
                        },
                        plan,
                        { kcal: profile.kcalTarget, proteinG: profile.proteinTarget },
                      ),
                    );
                  }}
                >
                  Build plans
                </Button>
              </>
            )}
          </div>
        </Panel>
      )}

      {missing.length ? null : details}
    </>
  );
}

/** What the numbers are calculated from. Changing any of these updates them. */
function DetailsPanel({ profile, save, highlight }: { profile: Profile; save: (p: Partial<Profile>) => Promise<void>; highlight: boolean }) {
  const [age, setAge] = useState(profile.age !== undefined ? String(profile.age) : "");
  const [ageError, setAgeError] = useState<string | null>(null);

  return (
    <Panel title="About you" meta={highlight ? "NEEDED" : undefined} className="mb-4">
      <div className="space-y-4 border-t border-line-1 px-4 py-4">
        <p className="t-micro text-frost-2">YOUR TARGETS ARE CALCULATED FROM THESE. CHANGE ONE AND THEY UPDATE.</p>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Choice label="SEX" value={profile.sex ?? null} options={SEX_OPTIONS} onChange={(v) => void save({ sex: v })} />
          <Field
            label="AGE"
            type="number"
            inputMode="numeric"
            value={age}
            error={ageError}
            onChange={(v) => {
              setAge(v);
              const n = Number(v);
              if (Number.isInteger(n) && n >= 10 && n <= 100) {
                setAgeError(null);
                void save({ age: n });
              } else {
                setAgeError(v.trim() === "" ? "Enter your age" : "Whole years");
              }
            }}
          />
        </div>
        <Choice
          label="TRAINING EXPERIENCE"
          value={profile.experience ?? "intermediate"}
          options={EXPERIENCE_OPTIONS}
          onChange={(v) => void save({ experience: v })}
        />
        <Choice label="EQUIPMENT" value={profile.equipment ?? "full"} options={EQUIPMENT_OPTIONS} onChange={(v) => void save({ equipment: v })} />
        <MultiChoice
          label="INJURIES TO WORK AROUND"
          value={profile.injuries ?? []}
          options={INJURY_OPTIONS}
          onChange={(v) => void save({ injuries: v })}
        />
        <MultiChoice
          label="HEALTH CONDITIONS"
          value={profile.conditions ?? []}
          options={CONDITION_OPTIONS.filter((o) => profile.sex === "female" || !FEMALE_ONLY_CONDITIONS.has(o.value))}
          onChange={(v) => void save({ conditions: v })}
        />
      </div>
    </Panel>
  );
}
