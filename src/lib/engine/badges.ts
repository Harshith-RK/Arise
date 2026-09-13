import type { Rank } from "./types";

export type BadgeKind = "rank" | "shield" | "record" | "milestone" | "body";

export type BadgeDef = {
  id: string;
  name: string;
  kind: BadgeKind;
  /** How it is earned, in the System's voice. */
  rule: string;
  target: number;
  unit: string;
  rank?: Rank;
};

export const BADGES: BadgeDef[] = [
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
  { id: "days-90", name: "Ninety Days", kind: "milestone", rule: "Reach day ninety of the arc.", target: 90, unit: "DAYS" },
  { id: "shield-90", name: "Bastion", kind: "shield", rule: "Clear ninety consecutive days.", target: 90, unit: "DAYS" },
  { id: "records-50", name: "Fifty Records", kind: "record", rule: "Set fifty personal records.", target: 50, unit: "PRS" },
  { id: "cardio-150", name: "Furnace", kind: "milestone", rule: "Complete a hundred and fifty cardio sessions.", target: 150, unit: "SESSIONS" },
  { id: "days-180", name: "Half Year", kind: "milestone", rule: "Reach day one hundred and eighty.", target: 180, unit: "DAYS" },
  { id: "iron-2500", name: "Forge", kind: "record", rule: "Complete two thousand five hundred working sets.", target: 2500, unit: "SETS" },
  { id: "weigh-52", name: "Year Measured", kind: "body", rule: "Log fifty-two weekly weigh-ins.", target: 52, unit: "WEIGH-INS" },
  { id: "days-365", name: "One Year", kind: "milestone", rule: "Reach day three hundred and sixty-five.", target: 365, unit: "DAYS" },
  { id: "shield-365", name: "Year Unbroken", kind: "shield", rule: "Clear three hundred and sixty-five consecutive days.", target: 365, unit: "DAYS" },
  { id: "rank-D", name: "Rank D", kind: "rank", rule: "Reach level 10.", target: 10, unit: "LEVEL", rank: "D" },
  { id: "rank-C", name: "Rank C", kind: "rank", rule: "Reach level 20.", target: 20, unit: "LEVEL", rank: "C" },
  { id: "rank-B", name: "Rank B", kind: "rank", rule: "Reach level 30.", target: 30, unit: "LEVEL", rank: "B" },
  { id: "rank-A", name: "Rank A", kind: "rank", rule: "Reach level 40.", target: 40, unit: "LEVEL", rank: "A" },
  { id: "rank-S", name: "Rank S", kind: "rank", rule: "Reach level 50.", target: 50, unit: "LEVEL", rank: "S" },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((t) => [t.id, t])) as Record<string, BadgeDef>;

export type BadgeState = {
  id: string;
  current: number;
  unlockedOn: string | null;
};
