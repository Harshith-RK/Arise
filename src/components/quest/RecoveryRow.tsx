"use client";

import { useState } from "react";
import { CompletionSquare, StrikeLabel, WeightStepper } from "./QuestBits";
import { IconLock } from "@/components/icons";
import { VITALITY_UNLOCK_LEVEL } from "@/lib/engine/derive";

/**
 * Recovery logging. Visible from day one but sealed until VITALITY unlocks at
 * level 5: the controls are shown inert rather than hidden, so the stat has a
 * place you can see before it has a place you can use.
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

  const sealed = level < VITALITY_UNLOCK_LEVEL;
  const logged = !sealed && hours != null;
  const toGo = VITALITY_UNLOCK_LEVEL - level;

  return (
    <div className="px-4 py-4">
      {sealed ? (
        // Nothing to press yet, so this is not a control.
        <div className="flex min-h-14 w-full items-center gap-3">
          <IconLock size={20} className="shrink-0 text-frost-2" />
          <span className="min-w-0 flex-1">
            <span className="t-body block text-frost-1">Recovery</span>
            <span className="t-micro mt-0.5 block text-frost-2">
              SEALED UNTIL LEVEL {VITALITY_UNLOCK_LEVEL}. {toGo} LEVEL{toGo === 1 ? "" : "S"} TO GO.
            </span>
          </span>
        </div>
      ) : (
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
      )}

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="t-micro mb-1.5 text-frost-2">SLEEP</p>
          <WeightStepper
            value={h}
            step={0.5}
            suffix="H"
            max={24}
            label="Hours slept"
            disabled={sealed}
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
            disabled={sealed}
            onChange={(v) => {
              setW(v);
              if (logged) onSave(h, v);
            }}
          />
        </div>
      </div>
      <p className="t-micro mt-3 text-frost-2">
        {sealed
          ? `VITALITY OPENS AT LEVEL ${VITALITY_UNLOCK_LEVEL}. FROM THEN, EVERY NIGHT OF SEVEN HOURS OR MORE GROWS IT.`
          : "SEVEN HOURS OR MORE COUNTS TOWARD VITALITY."}
      </p>
    </div>
  );
}
