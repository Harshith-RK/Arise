import type { Rank } from "@/lib/engine/types";

/**
 * Hexagonal rank plaque with the rank letter drawn as angular vector strokes.
 * Parts carry data-part attributes so ceremonies can draw them with GSAP.
 */
export const RANK_LETTER_PATHS: Record<Rank, string> = {
  E: "M37 31H63M37 31V69H63M37 50H57",
  D: "M37 31H55L63 39V61L55 69H37Z",
  C: "M63 31H45L37 39V61L45 69H63",
  B: "M37 69V31H57L63 37V44L57 50H37M57 50L63 56V63L57 69H37",
  A: "M35 69V41L45 31H55L65 41V69M35 54H65",
  S: "M63 31H43L37 37V44L43 50H57L63 56V63L57 69H37",
};

export const PLAQUE_FRAME = "M50 4L90 27V73L50 96L10 73V27Z";
export const PLAQUE_TRIM = "M50 12L83 31V69L50 88L17 69V31Z";

export type PlaqueTone = "locked" | "cold" | "lit" | "brass" | "white";

const TONES: Record<PlaqueTone, { frame: string; trim: string; fill: string; letter: string }> = {
  locked: { frame: "var(--line-2)", trim: "transparent", fill: "transparent", letter: "var(--line-2)" },
  cold: { frame: "var(--glacier)", trim: "var(--line-2)", fill: "var(--ink-2)", letter: "var(--glacier)" },
  lit: { frame: "var(--ember)", trim: "var(--line-2)", fill: "var(--ember-3)", letter: "var(--ember)" },
  brass: { frame: "var(--brass)", trim: "var(--brass)", fill: "var(--ember-3)", letter: "var(--ember)" },
  white: { frame: "var(--brass)", trim: "var(--brass)", fill: "var(--ember-3)", letter: "var(--core)" },
};

export function toneForRank(rank: Rank): PlaqueTone {
  if (rank === "S") return "white";
  if (rank === "B" || rank === "A") return "brass";
  if (rank === "E") return "cold";
  return "lit";
}

export function RankPlaque({
  rank,
  tone,
  size = 64,
  className,
  title,
}: {
  rank: Rank;
  tone?: PlaqueTone;
  size?: number;
  className?: string;
  title?: string;
}) {
  const t = TONES[tone ?? toneForRank(rank)];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path data-part="fill" d={PLAQUE_FRAME} fill={t.fill} stroke="none" />
      <path data-part="frame" d={PLAQUE_FRAME} fill="none" stroke={t.frame} strokeWidth={2.5} strokeLinejoin="miter" />
      <path
        data-part="trim"
        d={PLAQUE_TRIM}
        fill="none"
        stroke={t.trim}
        strokeWidth={1.25}
        strokeLinejoin="miter"
      />
      <path
        data-part="letter"
        d={RANK_LETTER_PATHS[rank]}
        fill="none"
        stroke={t.letter}
        strokeWidth={7}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
