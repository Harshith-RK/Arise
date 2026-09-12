"use client";

import { useState } from "react";
import { CompletionSquare, StrikeLabel, WeightStepper } from "./QuestBits";
import { VITALITY_UNLOCK_LEVEL } from "@/lib/engine/derive";

/**
 * Recovery logging. Hidden until VITALITY unlocks at level 5, so day one
 * is not cluttered with a stat that cannot move yet.
 */
export function RecoveryRow({
  level,
  hours,
  waterL,
  readOnly,
  onSave,
}: {
  level: number;
  hours: number | null;
  waterL: number | null;
  readOnly: boolean;
  onSave: (hours: number | null, waterL: number | null) => void;
}) {
  const [h, setH] = useState(hours ?? 7.5);
  const [w, setW] = useState(waterL ?? 3);

  if (level < VITALITY_UNLOCK_LEVEL) return null;
  const logged = hours != null;

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        disabled={readOnly}
        data-quest-row
        aria-pressed={logged}
        onClick={() => onSave(logged ? null : h, logged ? null : w)}
        className="pressable flex min-h-14 w-full items-center gap-3 text-left"
      >
        <CompletionSquare done={logged} />
        <span className="min-w-0 flex-1">
          <StrikeLabel done={logged} className="t-body">
            Recovery
          </StrikeLabel>
          <span className="t-micro mt-0.5 block text-frost-2">
            {logged ? `${hours} H SLEEP / ${waterL ?? 0} L WATER` : "LOG LAST NIGHT TO GROW VITALITY"}
          </span>
        </span>
      </button>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="t-micro mb-1.5 text-frost-2">SLEEP</p>
          <WeightStepper
            value={h}
            step={0.5}
            suffix="H"
            max={24}
            label="Hours slept"
            onChange={(v) => {
              setH(v);
              if (logged) onSave(v, w);
            }}
          />
        </div>
        <div>
          <p className="t-micro mb-1.5 text-frost-2">WATER</p>
          <WeightStepper
            value={w}
            step={0.5}
            suffix="L"
            max={20}
            label="Litres of water"
            onChange={(v) => {
              setW(v);
              if (logged) onSave(h, v);
            }}
          />
        </div>
      </div>
      <p className="t-micro mt-3 text-frost-2">SEVEN HOURS OR MORE COUNTS TOWARD VITALITY.</p>
    </div>
  );
}
