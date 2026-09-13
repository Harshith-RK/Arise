import { dayKeyOf, diffDays, eachDay, weekStart } from "./dates";
import { evaluateDay, makePlanLookup, type DayResult } from "./day";
import { round1, setScore } from "./pr";
import { BADGES, type BadgeState } from "./badges";
import type { DayLog, Rank, Snapshot, WeighIn } from "./types";
import { isCutting, levelForXp, levelProgress, rankForLevel, shieldXp, weighInDrift, XP } from "./xp";

/* ==========================================================================
   deriveProgress: one chronological pass over the arc. Pure and
   deterministic for a given snapshot + today, which is what makes undo exact.
   ========================================================================== */

export type StreakCategory = "workout" | "diet" | "cardio";
export type StreakState = "burning" | "banked" | "broken" | "unlit";

export type Streak = {
  category: StreakCategory;
  count: number;
  best: number;
  state: StreakState;
  /** Date of the most recent miss, if the streak is currently broken. */
  brokenOn: string | null;
  /** Per-day history for the streak calendar. */
  history: Record<string, "done" | "missed" | "rest" | "pending">;
};

export type StatKey = "strength" | "stamina" | "discipline" | "vitality";

export type Stat = {
  key: StatKey;
  value: number;
  /** Progress toward the next point, 0..1. */
  toNext: number;
  locked: boolean;
  rule: string;
  nextLabel: string;
};

export type PersonalRecord = {
  date: string;
  exerciseId: string;
  variantId: string;
  weight: number;
  reps: number;
  score: number;
  e1rm: number;
};

export type XpPoint = { date: string; xp: number; level: number };

export type Progress = {
  today: string;
  arcDay: number;
  xp: number;
  level: number;
  rank: Rank;
  levelInto: number;
  levelSpan: number;
  levelRatio: number;
  stats: Record<StatKey, Stat>;
  streaks: Record<StreakCategory, Streak>;
  fullStreak: number;
  bestFullStreak: number;
  days: Record<string, DayResult>;
  records: PersonalRecord[];
  bestByVariant: Record<string, PersonalRecord>;
  badges: Record<string, BadgeState>;
  xpHistory: XpPoint[];
  totals: { sets: number; cardio: number; fullDietDays: number; goodSleep: number; weighInWeeks: number };
  latestWeighIn: WeighIn | null;
  weighInDue: boolean;
};

const STAT_BASE = 10;
export const SETS_PER_STRENGTH = 20;
export const CARDIO_PER_STAMINA = 3;
export const NIGHTS_PER_VITALITY = 3;
export const VITALITY_UNLOCK_LEVEL = 5;

function emptyStreak(category: StreakCategory): Streak {
  return { category, count: 0, best: 0, state: "unlit", brokenOn: null, history: {} };
}

export function deriveProgress(snap: Snapshot, today: string): Progress {
  const profile = snap.profile;
  const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
  const logsByDate = new Map<string, DayLog>(snap.dayLogs.map((l) => [l.date, l]));
  const weighIns = [...snap.weighIns].sort((a, b) => (a.date < b.date ? -1 : 1));

  const arcStart = profile?.arcStart ?? today;
  const start = arcStart <= today ? arcStart : today;
  // Include any logs dated before arc start (imported history) and future-dated logs are ignored.
  const firstLog = snap.dayLogs.reduce<string | null>((m, l) => (m === null || l.date < m ? l.date : m), null);
  const from = firstLog && firstLog < start ? firstLog : start;

  const days: Record<string, DayResult> = {};
  const streaks: Record<StreakCategory, Streak> = {
    workout: emptyStreak("workout"),
    diet: emptyStreak("diet"),
    cardio: emptyStreak("cardio"),
  };
  const lastApplicableOutcome: Record<StreakCategory, "done" | "missed" | null> = { workout: null, diet: null, cardio: null };

  let xp = 0;
  let sets = 0;
  let cardio = 0;
  let fullDietDays = 0;
  let goodSleep = 0;
  let fullStreak = 0;
  let bestFullStreak = 0;

  const records: PersonalRecord[] = [];
  const bestByVariant: Record<string, PersonalRecord> = {};
  const xpHistory: XpPoint[] = [];

  const badgeAt: Record<string, string | null> = Object.fromEntries(BADGES.map((t) => [t.id, null]));
  const unlock = (id: string, date: string) => {
    if (!badgeAt[id]) badgeAt[id] = date;
  };

  const weighInWeeks = new Set<string>();
  let weighIdx = 0;
  // The scale is scored on direction, so each reading needs the one before it.
  // Seeded from the profile's starting weight so the very first weigh-in of the
  // arc is measured against where the hunter began, not against nothing.
  const cutting = profile ? isCutting(profile.startWeightKg, profile.targetWeightKg) : true;
  let prevWeightKg: number | null = profile?.startWeightKg ?? null;
  let clearedThisWeek = 0;
  let bestWeekClears = 0;
  let currentWeek = "";

  for (const date of eachDay(from, today)) {
    const log = logsByDate.get(date);
    const r = evaluateDay(date, log, plans, profile ?? { restDays: ["sat", "sun"] });
    days[date] = r;
    const isToday = date === today;

    // ---- XP from the day itself
    xp += r.xp;

    // ---- Weigh-ins: first per ISO week earns XP
    while (weighIdx < weighIns.length && weighIns[weighIdx].date <= date) {
      const w = weighIns[weighIdx];
      const wk = weekStart(w.date);
      if (!weighInWeeks.has(wk)) {
        weighInWeeks.add(wk);
        xp += XP.weighIn;
        if (weighInWeeks.size >= 4) unlock("weigh-4", w.date);
        if (weighInWeeks.size >= 52) unlock("weigh-52", w.date);
      }
      // Direction is scored on every reading, not just the week's first, so
      // logging twice in a week cannot be used to bank the move twice.
      if (prevWeightKg !== null) xp += weighInDrift(prevWeightKg, w.weightKg, cutting);
      prevWeightKg = w.weightKg;
      // XP is a record of work done, never a debt: the floor is zero.
      if (xp < 0) xp = 0;
      if (profile && w.weightKg <= profile.phase1TargetKg) unlock("phase-one", w.date);
      weighIdx++;
    }

    // ---- Totals and stats inputs
    sets += r.setsDone;
    if (r.cardioComplete) cardio++;
    if (r.dietComplete) fullDietDays++;
    if (r.goodSleep) goodSleep++;
    if (sets >= 500) unlock("iron-500", date);
    if (sets >= 2500) unlock("iron-2500", date);
    if (cardio >= 30) unlock("cardio-30", date);
    if (cardio >= 150) unlock("cardio-150", date);

    // ---- Streaks per category
    const outcomes: Record<StreakCategory, { applicable: boolean; done: boolean }> = {
      workout: { applicable: r.workoutMandatory, done: r.workoutComplete },
      diet: { applicable: true, done: r.dietComplete },
      // Banked on rest days, exactly like the workout streak it now belongs to.
      cardio: { applicable: r.cardioMandatory, done: r.cardioComplete },
    };
    for (const cat of Object.keys(outcomes) as StreakCategory[]) {
      const s = streaks[cat];
      const o = outcomes[cat];
      if (!o.applicable) {
        s.history[date] = "rest";
        continue;
      }
      if (o.done) {
        s.count++;
        s.best = Math.max(s.best, s.count);
        s.history[date] = "done";
        lastApplicableOutcome[cat] = "done";
        s.brokenOn = null;
      } else if (isToday) {
        s.history[date] = "pending";
      } else {
        s.history[date] = "missed";
        if (date >= arcStart) {
          s.count = 0;
          s.brokenOn = date;
          lastApplicableOutcome[cat] = "missed";
        }
      }
    }

    // ---- Full-completion streak and Streak Shields
    if (r.cleared) {
      fullStreak++;
      bestFullStreak = Math.max(bestFullStreak, fullStreak);
      unlock("first-gate", date);
      if (fullStreak % XP.shieldEvery === 0) xp += shieldXp(fullStreak);
      if (fullStreak >= 7) unlock("shield-7", date);
      if (fullStreak >= 14) unlock("shield-14", date);
      if (fullStreak >= 30) unlock("shield-30", date);
      if (fullStreak >= 90) unlock("shield-90", date);
      if (fullStreak >= 365) unlock("shield-365", date);
    } else if (!isToday && date >= arcStart) {
      fullStreak = 0;
    }

    // ---- Clean week (Mon to Sun all cleared)
    const wk = weekStart(date);
    if (wk !== currentWeek) {
      currentWeek = wk;
      clearedThisWeek = 0;
    }
    if (r.cleared) {
      clearedThisWeek++;
      bestWeekClears = Math.max(bestWeekClears, clearedThisWeek);
      if (clearedThisWeek === 7 && dayKeyOf(date) === "sun") unlock("week-one", date);
    }

    // ---- Personal records, chronological
    if (log) {
      const wPlan = plans.workout(log.workoutPlanVersion);
      for (const [exerciseId, exLog] of Object.entries(log.exercises)) {
        if (!wPlan.exercises[exerciseId] && !Object.values(snap.workoutPlans).some((p) => p.exercises[exerciseId])) continue;
        let top: PersonalRecord | null = null;
        for (const s of exLog.sets) {
          if (!s.done) continue;
          const score = setScore(s.weight, s.reps);
          if (score <= 0) continue;
          if (!top || score > top.score) {
            top = {
              date,
              exerciseId,
              variantId: exLog.variantId,
              weight: s.weight ?? 0,
              reps: s.reps ?? 0,
              score,
              e1rm: round1(s.weight && s.weight > 0 ? s.weight * (1 + (s.reps ?? 0) / 30) : 0),
            };
          }
        }
        if (!top) continue;
        const prev = bestByVariant[top.variantId];
        if (prev && top.score > prev.score + 1e-9) {
          records.push(top);
          unlock("first-record", date);
          if (records.length >= 10) unlock("records-10", date);
        }
        if (!prev || top.score > prev.score) bestByVariant[top.variantId] = top;
      }
    }

    // ---- Levels, ranks, arc milestones
    const lvl = levelForXp(xp);
    for (const [id, floor] of [["rank-D", 10], ["rank-C", 20], ["rank-B", 30], ["rank-A", 40], ["rank-S", 50]] as const) {
      if (lvl >= floor) unlock(id, date);
    }
    const arcDayHere = diffDays(arcStart, date) + 1;
    if (arcDayHere >= 30) unlock("month-one", date);
    if (arcDayHere >= 90) unlock("days-90", date);
    if (arcDayHere >= 180) unlock("days-180", date);
    if (arcDayHere >= 365) unlock("days-365", date);

    xpHistory.push({ date, xp, level: lvl });
  }

  // ---- Resolve streak states for today
  const todayResult = days[today];
  for (const cat of Object.keys(streaks) as StreakCategory[]) {
    const s = streaks[cat];
    const applicableToday =
      cat === "workout"
        ? !!todayResult?.workoutMandatory
        : cat === "cardio"
          ? !!todayResult?.cardioMandatory
          : true;
    if (!applicableToday) {
      s.state = s.count > 0 ? "banked" : lastApplicableOutcome[cat] === "missed" ? "broken" : "unlit";
    } else if (s.count > 0) {
      s.state = "burning";
    } else if (lastApplicableOutcome[cat] === "missed") {
      s.state = "broken";
    } else {
      s.state = "unlit";
    }
  }

  const lp = levelProgress(xp);
  const level = lp.level;
  const arcDay = Math.max(1, diffDays(arcStart, today) + 1);

  const stats: Record<StatKey, Stat> = {
    strength: {
      key: "strength",
      value: STAT_BASE + Math.floor(sets / SETS_PER_STRENGTH),
      toNext: (sets % SETS_PER_STRENGTH) / SETS_PER_STRENGTH,
      locked: false,
      rule: `Grows by 1 for every ${SETS_PER_STRENGTH} working sets you complete.`,
      nextLabel: `${SETS_PER_STRENGTH - (sets % SETS_PER_STRENGTH)} SETS TO +1`,
    },
    stamina: {
      key: "stamina",
      value: STAT_BASE + Math.floor(cardio / CARDIO_PER_STAMINA),
      toNext: (cardio % CARDIO_PER_STAMINA) / CARDIO_PER_STAMINA,
      locked: false,
      rule: `Grows by 1 for every ${CARDIO_PER_STAMINA} cardio sessions you complete.`,
      nextLabel: `${CARDIO_PER_STAMINA - (cardio % CARDIO_PER_STAMINA)} SESSIONS TO +1`,
    },
    discipline: {
      key: "discipline",
      value: STAT_BASE + fullDietDays,
      toNext: todayResult ? todayResult.mealsEaten / Math.max(1, todayResult.mealTotal) : 0,
      locked: false,
      rule: "Grows by 1 for every day you eat every planned meal.",
      nextLabel: todayResult
        ? `${todayResult.mealTotal - todayResult.mealsEaten} MEALS TO +1`
        : "EAT EVERY MEAL TO +1",
    },
    vitality: {
      key: "vitality",
      value: STAT_BASE + Math.floor(goodSleep / NIGHTS_PER_VITALITY),
      toNext: (goodSleep % NIGHTS_PER_VITALITY) / NIGHTS_PER_VITALITY,
      locked: level < VITALITY_UNLOCK_LEVEL,
      rule: `Unlocks at level ${VITALITY_UNLOCK_LEVEL}. Grows by 1 for every ${NIGHTS_PER_VITALITY} nights of 7+ hours of sleep you log.`,
      nextLabel:
        level < VITALITY_UNLOCK_LEVEL
          ? `UNLOCKS AT LEVEL ${VITALITY_UNLOCK_LEVEL}`
          : `${NIGHTS_PER_VITALITY - (goodSleep % NIGHTS_PER_VITALITY)} NIGHTS TO +1`,
    },
  };

  const badgeCurrent: Record<string, number> = {
    "first-gate": Object.values(days).some((d) => d.cleared) ? 1 : 0,
    "shield-7": bestFullStreak,
    "shield-14": bestFullStreak,
    "shield-30": bestFullStreak,
    "shield-90": bestFullStreak,
    "shield-365": bestFullStreak,
    "week-one": bestWeekClears,
    "first-record": records.length ? 1 : 0,
    "records-10": records.length,
    "records-50": records.length,
    "month-one": arcDay,
    "days-90": arcDay,
    "days-180": arcDay,
    "days-365": arcDay,
    "weigh-4": weighInWeeks.size,
    "weigh-52": weighInWeeks.size,
    "cardio-30": cardio,
    "cardio-150": cardio,
    "iron-500": sets,
    "iron-2500": sets,
    "phase-one": badgeAt["phase-one"] ? 1 : 0,
    "rank-D": level,
    "rank-C": level,
    "rank-B": level,
    "rank-A": level,
    "rank-S": level,
  };
  const badges: Record<string, BadgeState> = {};
  for (const t of BADGES) {
    badges[t.id] = { id: t.id, current: Math.min(t.target, badgeCurrent[t.id] ?? 0), unlockedOn: badgeAt[t.id] };
  }

  const latestWeighIn = weighIns.filter((w) => w.date <= today).at(-1) ?? null;
  const weighInDue = !weighInWeeks.has(weekStart(today));

  return {
    today,
    arcDay,
    xp,
    level,
    rank: rankForLevel(level),
    levelInto: lp.into,
    levelSpan: lp.span,
    levelRatio: lp.ratio,
    stats,
    streaks,
    fullStreak,
    bestFullStreak,
    days,
    records,
    bestByVariant,
    badges,
    xpHistory,
    totals: { sets, cardio, fullDietDays, goodSleep, weighInWeeks: weighInWeeks.size },
    latestWeighIn,
    weighInDue,
  };
}

/** Previous best for a variant strictly before `date` (for ghost text + PR checks). */
export function lastSessionFor(
  snap: Pick<Snapshot, "dayLogs">,
  exerciseId: string,
  variantId: string,
  beforeDate: string,
): { date: string; weight: number | null; reps: number | null } | null {
  const logs = snap.dayLogs
    .filter((l) => l.date < beforeDate && l.exercises[exerciseId]?.variantId === variantId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const l of logs) {
    const done = l.exercises[exerciseId].sets.filter((s) => s.done);
    if (!done.length) continue;
    const top = done.reduce((b, s) => ((s.weight ?? 0) > (b.weight ?? 0) ? s : b), done[0]);
    return { date: l.date, weight: top.weight, reps: top.reps };
  }
  return null;
}
