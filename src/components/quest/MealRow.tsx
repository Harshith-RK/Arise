"use client";

import { m, useMotionValue, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { Drawer } from "vaul";
import { CompletionSquare, StrikeLabel } from "./QuestBits";
import { SPRING, vibrate } from "@/lib/motion";
import { formatTime } from "@/lib/engine/dates";
import type { Macros, MealDef } from "@/lib/engine/types";

const COMMIT_PX = 72;

export function MealRow({
  meal,
  eaten,
  override,
  readOnly,
  onToggle,
  onOverride,
}: {
  meal: MealDef;
  eaten: boolean;
  override: Macros | null;
  readOnly: boolean;
  onToggle: () => void;
  onOverride: (m: Macros | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const armed = useRef(false);
  const x = useMotionValue(0);
  // Opacity, not colour: Motion cannot interpolate a CSS variable.
  const tint = useTransform(x, [0, COMMIT_PX], [0, 1]);
  const detailTint = useTransform(x, [-COMMIT_PX, 0], [1, 0]);
  const macros = override ?? { protein: meal.protein, carbs: meal.carbs, fat: meal.fat, kcal: meal.kcal };

  return (
    <>
      <m.div className="relative">
        <m.span className="pointer-events-none absolute inset-0 bg-ember-3" style={{ opacity: tint }} aria-hidden />
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
            } else if (!past) armed.current = false;
          }}
          onDragEnd={(_, info) => {
            armed.current = false;
            if (info.offset.x > COMMIT_PX || info.velocity.x > 480) onToggle();
            else if (info.offset.x < -COMMIT_PX || info.velocity.x < -480) setOpen(true);
          }}
          transition={SPRING.snap}
          className="row-rule relative bg-ink-1"
        >
          <div className="flex min-h-16 items-center gap-3 px-4 py-3">
            <span className="t-micro w-[62px] shrink-0 whitespace-nowrap text-frost-2">{formatTime(meal.time)}</span>
            <button
              type="button"
              onClick={onToggle}
              disabled={readOnly}
              aria-pressed={eaten}
              data-quest-row
              className="pressable flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <CompletionSquare done={eaten} />
              <span className="min-w-0 flex-1">
                <StrikeLabel done={eaten} className="t-body">
                  {meal.name}
                </StrikeLabel>
                <span className="t-micro mt-0.5 block text-frost-2">
                  {macros.protein}P / {macros.carbs}C / {macros.fat}F / {macros.kcal} KCAL
                  {override ? " / SWAPPED" : ""}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pressable t-micro h-11 shrink-0 border border-line-2 px-2 text-frost-2 transition-none hov:border-frost-2 hov:text-frost-0"
              aria-label={`Details for ${meal.name}`}
            >
              ITEMS
            </button>
          </div>
        </m.div>
      </m.div>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[75] bg-ink-0/70" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[76] mx-auto max-h-[88vh] w-full max-w-[560px] overflow-y-auto border-t border-line-2 bg-ink-1 outline-none">
            <Drawer.Title className="sr-only">{meal.name}</Drawer.Title>
            <Drawer.Description className="sr-only">Meal items and macro override for today.</Drawer.Description>
            <div className="mx-auto mt-3 h-1 w-10 bg-line-2" aria-hidden />
            <div className="px-4 py-5">
              <h3 className="t-title text-frost-0">{meal.name}</h3>
              <p className="t-micro mt-1 text-frost-2">{formatTime(meal.time)}</p>
              <ul className="mt-4 space-y-2">
                {meal.items.map((item) => (
                  <li key={item} className="t-small flex items-center gap-3 border-b border-line-1 pb-2 text-frost-1">
                    <span className="h-1 w-1 bg-frost-2" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <MacroOverride
                planned={{ protein: meal.protein, carbs: meal.carbs, fat: meal.fat, kcal: meal.kcal }}
                current={override}
                onSave={(m) => {
                  onOverride(m);
                  setOpen(false);
                }}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

/** Swapped something? Override today's macros without touching the plan. */
function MacroOverride({
  planned,
  current,
  onSave,
}: {
  planned: Macros;
  current: Macros | null;
  onSave: (m: Macros | null) => void;
}) {
  const [draft, setDraft] = useState<Macros>(current ?? planned);
  const field = (key: keyof Macros, label: string) => (
    <label className="block">
      <span className="t-micro text-frost-2">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
        className="t-readout mt-1 h-12 w-full border border-line-2 bg-ink-2 px-3 text-frost-0 outline-none focus-visible:border-ember"
      />
    </label>
  );
  return (
    <div className="mt-6 border-t border-line-1 pt-5">
      <p className="t-micro text-frost-2">SWAPPED SOMETHING? OVERRIDE TODAY ONLY.</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {field("protein", "P")}
        {field("carbs", "C")}
        {field("fat", "F")}
        {field("kcal", "KCAL")}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="pressable t-readout h-12 flex-1 bg-ember text-on-ember transition-none"
        >
          Save override
        </button>
        <button
          type="button"
          onClick={() => onSave(null)}
          className="pressable t-readout h-12 border border-line-2 px-4 text-frost-1 transition-none hov:bg-ink-2"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
