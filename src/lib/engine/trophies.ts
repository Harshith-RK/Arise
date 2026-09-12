import type { Rank } from "./types";

export type TrophyKind = "rank" | "shield" | "record" | "milestone" | "body";

export type TrophyDef = {
  id: string;
  name: string;
  kind: TrophyKind;
  /** How it is earned, in the System's voice. */
  rule: string;
  target: number;
  unit: string;
  rank?: Rank;
};

export const TROPHIES: TrophyDef[] = [
  { id: "first-gate", name: "First Gate", kind: "milestone", rule: "Clear every mandatory quest in a single day.", target: 1, unit: "DAY" },
  { id: "shield-7", name: "Streak Shield", kind: "shield", rule: "Clear seven consecutive days. Awards 200 XP.", target: 7, unit: "DAYS" },
  { id: "week-one", name: "Clean Week", kind: "milestone", rule: "Clear all seven days of one Monday to Sunday week.", target: 7, unit: "DAYS" },
  { id: "first-record", name: "First Record", kind: "record", rule: "Beat your best estimated one-rep max on any lift.", target: 1, unit: "PR" },
  { id: "shield-14", name: "Twin Shield", kind: "shield", rule: "Clear fourteen consecutive days.", target: 14, unit: "DAYS" },
  { id: "month-one", name: "First Month", kind: "milestone", rule: "Reach arc day 30.", target: 30, unit: "DAYS" },
  { id: "weigh-4", name: "Calibrated", kind: "body", rule: "Log four weekly weigh-ins.", target: 4, unit: "WEIGH-INS" },
  { id: "cardio-30", name: "Engine", kind: "milestone", rule: "Complete thirty cardio sessions.", target: 30, unit: "SESSIONS" },
  { id: "iron-500", name: "Iron Ledger", kind: "record", rule: "Complete five hundred working sets.", target: 500, unit: "SETS" },
  { id: "records-10", name: "Ten Records", kind: "record", rule: "Set ten personal records.", target: 10, unit: "PRS" },
  { id: "shield-30", name: "Aegis", kind: "shield", rule: "Clear thirty consecutive days.", target: 30, unit: "DAYS" },
  { id: "phase-one", name: "Phase One", kind: "body", rule: "Reach your Phase 1 target weight at a weigh-in.", target: 1, unit: "TARGET" },
  { id: "arc-complete", name: "Arc Complete", kind: "milestone", rule: "Reach the final day of the arc.", target: 90, unit: "DAYS" },
  { id: "rank-D", name: "Rank D", kind: "rank", rule: "Reach level 10.", target: 10, unit: "LEVEL", rank: "D" },
  { id: "rank-C", name: "Rank C", kind: "rank", rule: "Reach level 20.", target: 20, unit: "LEVEL", rank: "C" },
  { id: "rank-B", name: "Rank B", kind: "rank", rule: "Reach level 30.", target: 30, unit: "LEVEL", rank: "B" },
  { id: "rank-A", name: "Rank A", kind: "rank", rule: "Reach level 40.", target: 40, unit: "LEVEL", rank: "A" },
  { id: "rank-S", name: "Rank S", kind: "rank", rule: "Reach level 50.", target: 50, unit: "LEVEL", rank: "S" },
];

export const TROPHY_BY_ID = Object.fromEntries(TROPHIES.map((t) => [t.id, t])) as Record<string, TrophyDef>;

export type TrophyState = {
  id: string;
  current: number;
  unlockedOn: string | null;
};
