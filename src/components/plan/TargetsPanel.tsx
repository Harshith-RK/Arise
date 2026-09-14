"use client";

import { useMemo, useState } from "react";
import { Button, Panel } from "@/components/system/primitives";
import { Choice, MultiChoice } from "@/components/system/Choice";
import { Field } from "@/components/system/Field";
import { PlanReadout } from "./PlanReadout";
import { PlanPreview } from "./PlanPreview";
import type { Profile } from "@/lib/engine/types";
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
 * Calculated targets for a Hunter who is already awake. Recalculates from the
 * latest weigh-in, not the starting weight, so the numbers follow the body as it
 * changes. Nothing is overwritten until Apply.
 */
export function TargetsPanel({
  profile,
  currentWeightKg,
  save,
  rebuild,
  className,
}: {
  profile: Profile;
  currentWeightKg: number;
  save: (patch: Partial<Profile>) => Promise<void>;
  /** Installs rebuilt plans as new versions. History keeps the old ones. */
  rebuild: (plans: BuiltPlans) => Promise<void>;
  className?: string;
}) {
  const model = usePlanModel();
  const [age, setAge] = useState(profile.age !== undefined ? String(profile.age) : "");
  const [ageError, setAgeError] = useState<string | null>(null);

  const input = useMemo(() => planInputFromProfile(profile, currentWeightKg), [profile, currentWeightKg]);
  const plan = useMemo(() => (input ? planTargets(input, model) : null), [input, model]);
  const missing = missingForPlan({ sex: profile.sex ?? null, age: profile.age ?? null });
  const [preview, setPreview] = useState<BuiltPlans | null>(null);
  const [busy, setBusy] = useState(false);

  // Rebuilt from the targets as saved, so what gets built is what the Hunter applied.
  const makePlans = () => {
    if (!input || !plan) return null;
    return buildPlans(
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
    );
  };

  const applied =
    plan && !plan.refused && plan.kcal === profile.kcalTarget && plan.proteinG === profile.proteinTarget;

  return (
    <Panel title="Targets" className={className}>
      <div className="space-y-4 border-t border-line-1 px-4 py-4">
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
                setAgeError(v.trim() === "" ? null : "Whole years");
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
        <Choice
          label="EQUIPMENT"
          value={profile.equipment ?? "full"}
          options={EQUIPMENT_OPTIONS}
          onChange={(v) => void save({ equipment: v })}
        />
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

        {missing.length ? (
          <p className="t-micro border border-line-2 px-3 py-2 text-frost-1">
            ADD YOUR {missing.join(" AND ").toUpperCase()} ABOVE AND THE SYSTEM WILL CALCULATE YOUR TARGETS.
          </p>
        ) : plan ? (
          <>
            <p className="t-micro text-frost-2">CALCULATED AT {currentWeightKg.toFixed(1)} KG, YOUR LATEST READING.</p>
            <PlanReadout plan={plan} />
            {plan.refused ? null : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
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
                  {applied ? "Targets applied" : "Apply to my targets"}
                </Button>
                <p className="t-micro text-frost-2">
                  NOW {profile.kcalTarget} KCAL / {profile.proteinTarget} G
                  {profile.targetSource === "manual" || !profile.targetSource ? ", SET BY HAND" : ""}
                </p>
              </div>
            )}

            <div className="border-t border-line-1 pt-4">
              <p className="t-readout text-frost-0">Meal and training plans</p>
              <p className="t-micro mt-1 text-frost-2">
                BUILT FROM YOUR CURRENT TARGETS ({profile.kcalTarget} KCAL / {profile.proteinTarget} G), DIET CHOICES,
                SCHEDULE, EQUIPMENT AND INJURIES.
              </p>
              {preview ? (
                <div className="mt-3 space-y-3">
                  <PlanPreview plans={preview} />
                  <p className="t-micro border border-line-2 px-3 py-2 text-frost-1">
                    THIS REPLACES YOUR CURRENT MEAL PLAN, TRAINING PLAN AND SUPPLIES. PAST DAYS KEEP THE PLAN THEY WERE LOGGED
                    AGAINST.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await rebuild(preview);
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
                <Button className="mt-3" onClick={() => setPreview(makePlans())}>
                  Build plans
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  );
}
