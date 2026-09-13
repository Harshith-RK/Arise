import { PLAQUE_FRAME, PLAQUE_TRIM, RankPlaque } from "./RankPlaque";
import { BADGE_BY_ID } from "@/lib/engine/badges";

/* ==========================================================================
   Badge artwork. Every badge shares the hexagonal plaque so the wall reads
   as one system, and carries a glyph drawn for the thing it is awarded for.
   Same language as the icon set: angular, stroked, miter joins, no curves
   that the rest of the interface would not use.
   ========================================================================== */

/** Glyph paths per badge id, drawn inside the plaque on a 100x100 grid. */
const GLYPHS: Record<string, string[]> = {
  // A gate cleared: posts, a chamfered lintel, and the way through standing open.
  "first-gate": ["M33 71V41l9-9h16l9 9v30", "M27 71h46", "M45 71V55h10v16"],

  // The three shields tier by chevron count, so they are told apart at a glance.
  "shield-7": ["M50 28l18 7v17L50 70 32 52V35Z", "M41 45l9 7 9-7"],
  "shield-14": ["M50 28l18 7v17L50 70 32 52V35Z", "M41 41l9 7 9-7", "M43 52l7 6 7-6"],
  "shield-30": ["M50 28l18 7v17L50 70 32 52V35Z", "M41 38l9 7 9-7", "M43 48l7 6 7-6", "M45 58l5 5 5-5"],

  // Seven days in a row, every one filled.
  "week-one": [
    "M28 44h7v12h-7ZM37 44h7v12h-7ZM46 44h7v12h-7ZM55 44h7v12h-7ZM64 44h7v12h-7Z",
    "M28 62h43",
    "M32 38h35",
  ],

  // A loaded bar, and the lift that beat the last one.
  "first-record": ["M28 50h44", "M35 42v16M41 37v26M59 37v26M65 42v16", "M43 32l7-7 7 7"],

  // Records stacking up.
  "records-10": ["M27 70h46", "M33 70V58M41 70V51M49 70V43M57 70V34M65 70V26"],

  // A month of squares.
  "month-one": [
    "M28 34h44v38H28Z",
    "M28 44h44",
    "M38 28v8M62 28v8",
    "M38 52h4v4h-4ZM48 52h4v4h-4ZM58 52h4v4h-4ZM38 61h4v4h-4ZM48 61h4v4h-4Z",
  ],

  // A balance, read four times.
  "weigh-4": ["M28 40h44", "M50 40v24", "M38 66h24", "M34 40l-6 10h12ZM66 40l-6 10h12Z"],

  // The engine: a working heart rate.
  "cardio-30": ["M26 50h11l7-17 10 34 6-17h14", "M50 28v-4M50 76v-4"],

  // The ledger: a heavy bar over tallied sets.
  "iron-500": ["M28 44h44", "M34 36v16M40 32v24M60 32v24M66 36v16", "M34 66h8M46 66h8M58 66h8"],

  // Phase one: weight driven down onto the marker.
  "phase-one": ["M50 26v26", "M42 44l8 8 8-8", "M30 60h40", "M30 68h40"],

  // Day milestones: a flag planted, then a taller mast for each horizon.
  "days-90": ["M36 72V30", "M36 32h26l-6 8 6 8H36", "M28 72h44"],
  "days-180": ["M32 72V26", "M32 28h30l-7 9 7 9H32", "M68 72V38", "M24 72h56"],
  "days-365": ["M28 72V24", "M28 26h26l-6 8 6 8H28", "M50 72V34", "M68 72V44", "M22 72h58"],

  // Streaks that outlast a season: the shield gains walls behind it.
  "shield-90": ["M50 26l18 7v17L50 70 32 52V35Z", "M41 38l9 7 9-7", "M43 48l7 6 7-6", "M45 58l5 5 5-5", "M24 30v26M76 30v26"],
  "shield-365": ["M50 24l20 8v19L50 72 30 51V32Z", "M50 34v28", "M38 44l12-10 12 10", "M22 26v34M78 26v34", "M22 68h56"],

  // Records stacking higher than the ten-record ladder.
  "records-50": ["M27 72h46", "M31 72V62M39 72V52M47 72V42M55 72V32M63 72V24M71 72V34", "M27 30h10"],

  // The furnace: the engine trace, doubled and driven.
  "cardio-150": ["M24 44h10l6-14 8 28 5-14h11", "M24 60h10l6-10 8 20 5-10h11", "M74 38v30"],

  // The forge: an anvil under the bar.
  "iron-2500": ["M28 38h44", "M34 30v16M40 26v24M60 26v24M66 30v16", "M32 60h36l-6 10H38Z", "M44 70h12v6H44Z"],

  // A year of readings: the balance, ringed.
  "weigh-52": ["M28 40h44", "M50 40v22", "M38 64h24", "M34 40l-6 10h12ZM66 40l-6 10h12Z", "M50 34V24"],
};

export type BadgeProps = {
  id: string;
  earned: boolean;
  size?: number;
  className?: string;
};

/**
 * One badge. Rank badges keep their letter plaque; everything else gets the
 * glyph drawn for its own achievement.
 */
export function Badge({ id, earned, size = 40, className }: BadgeProps) {
  const def = BADGE_BY_ID[id];
  if (def?.rank) {
    return <RankPlaque rank={def.rank} tone={earned ? "brass" : "locked"} size={size} className={className} title={def.name} />;
  }

  const glyph = GLYPHS[id] ?? [];
  const stroke = earned ? "var(--brass)" : "var(--line-2)";
  const fill = earned ? "var(--ember-3)" : "transparent";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={def ? `${def.name}${earned ? ", earned" : ", locked"}` : undefined}
    >
      <path d={PLAQUE_FRAME} fill={fill} stroke="none" />
      <path d={PLAQUE_FRAME} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="miter" />
      {earned ? <path d={PLAQUE_TRIM} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="miter" opacity={0.5} /> : null}
      <g fill="none" stroke={stroke} strokeWidth={4} strokeLinejoin="miter" strokeLinecap="square">
        {glyph.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
