"use client";

import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Field } from "@/components/system/Field";
import { Button } from "@/components/system/primitives";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { WeighInSchema } from "@/lib/engine/types";
import { deriveProgress } from "@/lib/engine/derive";

/**
 * Weekly weigh-in. Mirrors InBody-style readings. The first of the week awards
 * 20 XP for the act of logging; on top of that the scale is scored on which way
 * it moved, so a gain costs XP rather than passing unremarked.
 */
export function WeighInSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { actions, dispatch } = useGameActions();
  const today = useGame((s) => s.today);
  const profile = useGame((s) => s.snapshot?.profile ?? null);
  const latest = useGame((s) => s.progress?.latestWeighIn ?? null);

  const [weight, setWeight] = useState(String(latest?.weightKg ?? profile?.startWeightKg ?? ""));
  const [fat, setFat] = useState(String(latest?.bodyFatPct ?? profile?.bodyFatPct ?? ""));
  const [muscle, setMuscle] = useState(String(latest?.muscleKg ?? profile?.muscleKg ?? ""));
  const [visceral, setVisceral] = useState(String(latest?.visceral ?? profile?.visceral ?? ""));
  const [error, setError] = useState<string | null>(null);

  // What this reading does to the arc, answered by the engine itself rather
  // than by re-implementing the rules here: the scale is scored on direction,
  // and a gain costs XP. Running the real derivation keeps this number and the
  // notice that follows it from ever disagreeing.
  const snapshot = useGame((s) => s.snapshot);
  const currentXp = useGame((s) => s.progress?.xp ?? 0);
  const weighInDue = useGame((s) => s.progress?.weighInDue ?? true);
  const typed = Number(weight);

  // The reading this one is measured against: the last one before today, or
  // where the arc started if this is the first.
  const baseline =
    [...(snapshot?.weighIns ?? [])]
      .filter((x) => x.date < today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .at(-1)?.weightKg ??
    profile?.startWeightKg ??
    null;
  const cutting = profile ? profile.targetWeightKg <= profile.startWeightKg : true;
  const delta = useMemo(() => {
    if (!snapshot || !Number.isFinite(typed) || typed <= 0) return null;
    const next = {
      ...snapshot,
      weighIns: [
        ...snapshot.weighIns.filter((x) => x.date !== today),
        { date: today, weightKg: typed, bodyFatPct: null, muscleKg: null, visceral: null },
      ],
    };
    return deriveProgress(next, today).xp - currentXp;
  }, [snapshot, typed, today, currentXp]);

  const submit = async () => {
    const parsed = WeighInSchema.safeParse({
      date: today,
      weightKg: Number(weight),
      bodyFatPct: fat.trim() === "" ? null : Number(fat),
      muscleKg: muscle.trim() === "" ? null : Number(muscle),
      visceral: visceral.trim() === "" ? null : Math.round(Number(visceral)),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the numbers.");
      return;
    }
    const outcome = await actions.logWeighIn(parsed.data);
    dispatch(outcome);
    onOpenChange(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[75] bg-ink-0/70" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[76] mx-auto max-h-[90vh] w-full max-w-[520px] overflow-y-auto border-t border-line-2 bg-ink-1 outline-none">
          <Drawer.Title className="sr-only">Log weigh-in</Drawer.Title>
          <Drawer.Description className="sr-only">Record this week&apos;s body measurements.</Drawer.Description>
          <div className="mx-auto mt-3 h-1 w-10 bg-line-2" aria-hidden />
          <div className="px-4 py-5">
            <h2 className="t-title text-frost-0">Weigh-in</h2>
            <p className="t-micro mt-1 text-frost-2">
              {weighInDue ? "FIRST WEIGH-IN OF THE WEEK AWARDS 20 XP." : "THIS WEEK IS ALREADY LOGGED."}{" "}
              {cutting ? "WEIGHT LOST EARNS XP, WEIGHT GAINED COSTS IT." : "WEIGHT GAINED EARNS XP, WEIGHT LOST COSTS IT."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="WEIGHT" suffix="KG" type="number" inputMode="decimal" step={0.1} value={weight} onChange={setWeight} error={error} autoFocus />
              <Field label="BODY FAT" suffix="%" type="number" inputMode="decimal" step={0.1} value={fat} onChange={setFat} />
              <Field label="SKELETAL MUSCLE" suffix="KG" type="number" inputMode="decimal" step={0.1} value={muscle} onChange={setMuscle} />
              <Field label="VISCERAL FAT" type="number" inputMode="numeric" value={visceral} onChange={setVisceral} />
            </div>
            {delta !== null && baseline !== null ? (
              <p
                className={`t-micro mt-4 ${delta < 0 ? "text-fault" : delta > 0 ? "text-brass" : "text-frost-2"}`}
                aria-live="polite"
              >
                {`AGAINST ${baseline.toFixed(1)} KG: `}
                {delta === 0 ? "NO CHANGE" : delta > 0 ? `+${delta} XP` : `${delta} XP`}
              </p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <Button type="button" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="button" variant="primary" className="flex-1" onClick={() => void submit()}>
                Log weigh-in
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
