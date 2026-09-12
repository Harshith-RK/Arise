"use client";

import { m, useMotionValue, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { Drawer } from "vaul";
import { CompletionSquare, Keypad, StrikeLabel, WeightStepper } from "./QuestBits";
import { IconRecord } from "@/components/icons";
import { SPRING, vibrate } from "@/lib/motion";
import type { ExerciseDef, SetLog } from "@/lib/engine/types";

const COMMIT_PX = 72;
const COMMIT_VELOCITY = 480;

export type ExerciseRowProps = {
  def: ExerciseDef;
  variantId: string;
  sets: SetLog[];
  done: boolean;
  isPr: boolean;
  lastSession: { date: string; weight: number | null; reps: number | null } | null;
  readOnly: boolean;
  onCompleteAll: (weight: number, reps: number, source: "pointer" | "keyboard") => void;
  onReopen: () => void;
  onToggleSet: (index: number, patch: Partial<SetLog>) => void;
  onVariant: (variantId: string) => void;
};

/**
 * One exercise. The whole 64px row is the tap target; on touch it can also
 * be swiped right to clear or left to open its detail sheet, with
 * rubber-banding and a haptic tick at the commit point.
 */
export function ExerciseRow(props: ExerciseRowProps) {
  const { def, variantId, sets, done, isPr, lastSession, readOnly } = props;
  const variant = def.variants.find((v) => v.id === variantId) ?? def.variants[0];
  const [detail, setDetail] = useState(false);
  const [keypad, setKeypad] = useState(false);
  const [weight, setWeight] = useState<number>(() => lastSession?.weight ?? 0);
  const armed = useRef(false);
  const x = useMotionValue(0);
  // Opacity, not colour: Motion cannot interpolate a CSS variable.
  const clearTint = useTransform(x, [0, COMMIT_PX], [0, 1]);
  const detailTint = useTransform(x, [-COMMIT_PX, 0], [1, 0]);
  const setsDone = sets.filter((s) => s.done).length;
  const reps = lastSession?.reps ?? variant.repsMin;

  const complete = (source: "pointer" | "keyboard") => {
    if (readOnly) return;
    if (done) props.onReopen();
    else props.onCompleteAll(weight, reps, source);
  };

  return (
    <>
      <m.div className="relative">
        <m.span className="pointer-events-none absolute inset-0 bg-ember-3" style={{ opacity: clearTint }} aria-hidden />
        <m.span className="pointer-events-none absolute inset-0 bg-ink-3" style={{ opacity: detailTint }} aria-hidden />
        <m.div
          drag={readOnly ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          dragSnapToOrigin
          style={{ x }}
          onDrag={(_, info) => {
            const past = Math.abs(info.offset.x) > COMMIT_PX;
            if (past && !armed.current) {
              armed.current = true;
              vibrate(6);
            } else if (!past) {
              armed.current = false;
            }
          }}
          onDragEnd={(_, info) => {
            armed.current = false;
            const far = info.offset.x > COMMIT_PX || info.velocity.x > COMMIT_VELOCITY;
            const back = info.offset.x < -COMMIT_PX || info.velocity.x < -COMMIT_VELOCITY;
            if (far) complete("pointer");
            else if (back) setDetail(true);
          }}
          transition={SPRING.snap}
          className="row-rule relative bg-ink-1"
        >
          <div className="flex min-h-16 items-center gap-3 px-4 py-3">
            <button
              type="button"
              className="pressable flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => complete("pointer")}
              disabled={readOnly}
              aria-pressed={done}
              data-quest-row
            >
              <CompletionSquare done={done} />
              <span className="min-w-0 flex-1">
                <StrikeLabel done={done} className="t-body">
                  {variant.name}
                </StrikeLabel>
                <span className="t-micro mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-frost-2">
                  <span>
                    {def.targetSets} x {variant.repsMin === variant.repsMax ? variant.repsMin : `${variant.repsMin}-${variant.repsMax}`}
                  </span>
                  <span aria-hidden>/</span>
                  <span>{def.muscleRegion.toUpperCase()}</span>
                  {lastSession ? (
                    <>
                      <span aria-hidden>/</span>
                      <span>
                        LAST {lastSession.weight ? `${lastSession.weight} KG` : "BW"} x {lastSession.reps ?? "-"}
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
            </button>

            {isPr ? (
              <m.span
                initial={{ scale: 1.35, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: -6 }}
                transition={SPRING.seal}
                className="t-micro flex shrink-0 items-center gap-1 border border-brass px-1.5 py-0.5 text-brass"
              >
                <IconRecord size={12} />
                PR
              </m.span>
            ) : null}

            <span className="t-micro shrink-0 text-frost-2" aria-label={`${setsDone} of ${def.targetSets} sets logged`}>
              {setsDone}/{def.targetSets}
            </span>

            <button
              type="button"
              onClick={() => setDetail(true)}
              className="pressable t-micro h-11 shrink-0 border border-line-2 px-2 text-frost-2 transition-none hov:border-frost-2 hov:text-frost-0"
              aria-label={`Open details for ${variant.name}`}
            >
              SETS
            </button>
          </div>
        </m.div>
      </m.div>

      <Drawer.Root open={detail} onOpenChange={setDetail}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[75] bg-ink-0/70" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[76] mx-auto max-h-[88vh] w-full max-w-[560px] overflow-y-auto border-t border-line-2 bg-ink-1 outline-none">
            <Drawer.Title className="sr-only">{variant.name}</Drawer.Title>
            <Drawer.Description className="sr-only">Log sets, weight and variant for this exercise.</Drawer.Description>
            <div className="mx-auto mt-3 h-1 w-10 bg-line-2" aria-hidden />
            <div className="px-4 py-5">
              <h3 className="t-title text-frost-0">{variant.name}</h3>
              <p className="t-micro mt-1 text-frost-2">
                {def.muscleRegion.toUpperCase()} / TARGET {def.targetSets} x{" "}
                {variant.repsMin === variant.repsMax ? variant.repsMin : `${variant.repsMin}-${variant.repsMax}`}
              </p>

              {def.variants.length > 1 ? (
                <div className="mt-5">
                  <p className="t-micro mb-2 text-frost-2">MOVEMENT</p>
                  <div className="flex border border-line-2" role="group" aria-label="Exercise variant">
                    {def.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => props.onVariant(v.id)}
                        aria-pressed={v.id === variantId}
                        className="pressable t-micro h-11 flex-1 border-r border-line-2 px-2 text-frost-2 transition-none last:border-r-0 aria-pressed:bg-ember aria-pressed:text-on-ember"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <p className="t-micro mb-2 text-frost-2">WEIGHT USED</p>
                <WeightStepper
                  value={weight}
                  onChange={setWeight}
                  onOpenKeypad={() => setKeypad(true)}
                  label="Weight"
                />
              </div>

              <div className="mt-5">
                <p className="t-micro mb-2 text-frost-2">SETS</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: def.targetSets }, (_, i) => {
                    const s = sets[i];
                    const isDone = !!s?.done;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          props.onToggleSet(i, {
                            done: !isDone,
                            weight: s?.weight ?? weight,
                            reps: s?.reps ?? reps,
                          })
                        }
                        aria-pressed={isDone}
                        className="pressable t-micro h-14 min-w-[72px] flex-1 border border-line-2 text-frost-2 transition-none aria-pressed:border-ember aria-pressed:bg-ember-3 aria-pressed:text-ember"
                      >
                        SET {i + 1}
                        <span className="mt-0.5 block text-[10px]">
                          {isDone ? `${s?.weight ? `${s.weight}KG` : "BW"} x ${s?.reps ?? reps}` : "TAP"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className="pressable t-readout mt-6 h-14 w-full bg-ember text-on-ember transition-none disabled:opacity-40"
                disabled={readOnly}
                onClick={() => {
                  complete("pointer");
                  setDetail(false);
                }}
              >
                {done ? "Reopen exercise" : "Clear all sets"}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Drawer.Root open={keypad} onOpenChange={setKeypad}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[77] bg-ink-0/70" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[78] mx-auto w-full max-w-[420px] border-t border-line-2 bg-ink-1 outline-none">
            <Drawer.Title className="sr-only">Set weight</Drawer.Title>
            <Drawer.Description className="sr-only">Enter the weight used for this exercise.</Drawer.Description>
            <div className="mx-auto mt-3 h-1 w-10 bg-line-2" aria-hidden />
            <Keypad value={weight} onChange={setWeight} onDone={() => setKeypad(false)} />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
