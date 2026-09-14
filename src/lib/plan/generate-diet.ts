import type { DayKey, MealDef, SupplyItem } from "@/lib/engine/types";
import { timeToMinutes } from "@/lib/engine/dates";
import { allowed, FOOD_BY_ID, gramsOf, type DietPrefs, type Food } from "./library/foods";
import { MEAL_TEMPLATES, type MealTemplate, type Slot } from "./library/meals";

/* ==========================================================================
   Diet plan generator.

   Targets in, a day of real meals out:
     1. schedule meal slots around the gym window
     2. share the day's macros across slots by what each slot is for
     3. pick a dish per slot the Hunter's diet allows, avoiding repeats
     4. solve portions for each meal (bounded least squares), round to what a
        kitchen can measure, then nudge portions across the whole day so the
        totals land on the targets
   ========================================================================== */

export type DietTargets = { kcal: number; proteinG: number; carbsG: number; fatG: number };

export type DietInput = DietTargets & {
  prefs: DietPrefs;
  gymStart: string;
  gymEnd: string;
};

type Macro4 = { p: number; c: number; f: number; k: number };

type ChosenPart = { food: Food; amount: number; scale: boolean; index: number };
type Meal = { slot: Slot; minutes: number; template: MealTemplate; parts: ChosenPart[]; target: Macro4 };

type DayTotals = { protein: number; carbs: number; fat: number; kcal: number };

export type GeneratedDiet = {
  /** A different day of meals for every weekday. */
  days: Record<DayKey, MealDef[]>;
  totals: Record<DayKey, DayTotals>;
  average: DayTotals;
  supplies: SupplyItem[];
};

/* ---------------------------------------------------------------- schedule */

const SHARE: Record<Slot, Macro4> = {
  breakfast: { p: 0.9, c: 0.9, f: 0.9, k: 0.9 },
  lunch: { p: 1, c: 1, f: 1, k: 1 },
  dinner: { p: 1, c: 0.85, f: 1, k: 0.95 },
  snack: { p: 0.45, c: 0.4, f: 0.55, k: 0.45 },
  pre: { p: 0.25, c: 0.7, f: 0.15, k: 0.4 },
  post: { p: 0.9, c: 0.8, f: 0.25, k: 0.6 },
};

const toTime = (m: number) => {
  const c = Math.max(300, Math.min(23 * 60 + 30, Math.round(m / 5) * 5));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};

/** Meal slots with times. More food means more, smaller meals. */
export function schedule(kcal: number, gymStart: string, gymEnd: string): { slot: Slot; minutes: number }[] {
  const count = kcal < 1700 ? 4 : kcal < 2300 ? 5 : kcal < 2900 ? 6 : 7;
  const start = timeToMinutes(gymStart);
  const end = timeToMinutes(gymEnd);
  const gym = Number.isFinite(start) && Number.isFinite(end) && end - start >= 30 && end - start <= 240;
  const GAP = 75;

  const slots: { slot: Slot; minutes: number }[] = [
    { slot: "breakfast", minutes: 450 },
    { slot: "lunch", minutes: 780 },
    { slot: "dinner", minutes: 1230 },
  ];
  const clash = (m: number) => slots.find((s) => Math.abs(s.minutes - m) < GAP);

  if (gym) {
    // A main meal right after training is the post-workout meal: move it there
    // rather than stacking a shake on top of dinner.
    const post = end + 20;
    const main = clash(post);
    if (main) main.minutes = post;
    else slots.push({ slot: "post", minutes: post });

    const pre = start - 60;
    if (!clash(pre) && slots.length < count) slots.push({ slot: "pre", minutes: pre });
  }
  // Snack times in order of preference; the later ones only fill in when
  // training has already taken the usual spots.
  for (const minutes of [990, 630, 1335, 900, 1380, 540]) {
    if (slots.length >= count) break;
    if (!clash(minutes)) slots.push({ slot: "snack", minutes });
  }
  return slots.sort((a, b) => a.minutes - b.minutes);
}

/* ---------------------------------------------------------------- macros */

const perUnit = (food: Food): Macro4 => {
  const g = gramsOf(food, 1) / 100;
  const p = food.per100.p * g;
  const c = food.per100.c * g;
  const f = food.per100.f * g;
  return { p, c, f, k: p * 4 + c * 4 + f * 9 };
};

function sum(parts: ChosenPart[]): Macro4 {
  const t = { p: 0, c: 0, f: 0, k: 0 };
  for (const part of parts) {
    const u = perUnit(part.food);
    t.p += u.p * part.amount;
    t.c += u.c * part.amount;
    t.f += u.f * part.amount;
    t.k += u.k * part.amount;
  }
  return t;
}

const W: Macro4 = { p: 3, c: 1, f: 1.5, k: 2 };
const KEYS = ["p", "c", "f", "k"] as const;

function error(actual: Macro4, target: Macro4): number {
  let e = 0;
  for (const key of KEYS) {
    const scale = Math.max(target[key], key === "k" ? 80 : 8);
    // Going over on protein is close to harmless; under is the miss that costs
    // muscle. Weighting it that way stops protein-bearing carbs being refused
    // on high-carbohydrate days just because they bring a little protein along.
    const w = key === "p" ? (actual.p > target.p ? W.p * 0.2 : W.p * 1.6) : W[key];
    e += w * ((actual[key] - target[key]) / scale) ** 2;
  }
  return e;
}

/**
 * Portion caps are sized for an ordinary appetite. A 4,000 kcal day cannot fit
 * inside them across seven meals, so caps grow with the day's target; the
 * floors do not move.
 */
let portionScale = 1;
const bounds = (f: Food) => ({
  lo: f.min,
  hi: Math.max(f.max, Math.round((f.max * portionScale) / f.step) * f.step),
});
const snap = (f: Food, v: number) => {
  const { lo, hi } = bounds(f);
  const stepped = Math.round(v / f.step) * f.step;
  return Math.max(lo, Math.min(hi, stepped));
};

/** Bounded least squares by coordinate descent, then snapped to measurable steps and refined. */
function solveMeal(meal: Meal): void {
  const scaled = meal.parts.filter((p) => p.scale);
  for (let pass = 0; pass < 60; pass++) {
    for (const part of scaled) {
      const u = perUnit(part.food);
      const rest = sum(meal.parts.filter((p) => p !== part));
      let num = 0;
      let den = 0;
      for (const key of KEYS) {
        const s = Math.max(meal.target[key], key === "k" ? 80 : 8) ** 2;
        num += (W[key] * u[key] * (meal.target[key] - rest[key])) / s;
        den += (W[key] * u[key] * u[key]) / s;
      }
      const { lo, hi } = bounds(part.food);
      part.amount = den > 0 ? Math.max(lo, Math.min(hi, num / den)) : part.amount;
    }
  }
  for (const part of scaled) part.amount = snap(part.food, part.amount);
  refine([meal], (meals) => error(sum(meals[0].parts), meals[0].target), 30);
}

/** Greedy one-step moves on scaled portions while they reduce `score`. */
function refine(meals: Meal[], score: (m: Meal[]) => number, maxMoves: number): void {
  let best = score(meals);
  for (let n = 0; n < maxMoves; n++) {
    let move: { part: ChosenPart; to: number; value: number } | null = null;
    for (const meal of meals) {
      for (const part of meal.parts) {
        if (!part.scale) continue;
        const from = part.amount;
        for (const to of [from - part.food.step, from + part.food.step]) {
          const { lo, hi } = bounds(part.food);
          if (to < lo - 1e-9 || to > hi + 1e-9) continue;
          part.amount = to;
          const value = score(meals);
          part.amount = from;
          if (value < best - 1e-9 && (!move || value < move.value)) move = { part, to, value };
        }
      }
    }
    if (!move) return;
    move.part.amount = move.to;
    best = move.value;
  }
}

/* ---------------------------------------------------------------- dishes */

function resolve(template: MealTemplate, prefs: DietPrefs, usedAnchors: Set<string>): ChosenPart[] | null {
  const parts: ChosenPart[] = [];
  for (const [index, comp] of template.components.entries()) {
    const options = comp.foods.map((id) => FOOD_BY_ID[id]).filter((f): f is Food => !!f && allowed(f, prefs));
    if (!options.length) {
      if (comp.optional) continue;
      return null;
    }
    // The first component is the dish's anchor: prefer one not eaten yet today.
    const food = index === 0 ? (options.find((f) => !usedAnchors.has(f.id)) ?? options[0]) : options[0];
    parts.push({ food, amount: snap(food, comp.amount), scale: comp.scale, index });
  }
  return parts;
}

function nameFor(meal: Meal): string {
  const shorts: Record<number, string> = {};
  for (const p of meal.parts) shorts[p.index] = p.food.short;
  const raw = meal.template.name
    .replace(/\{(\d+)\}/g, (_, i: string) => shorts[Number(i)] ?? "")
    .replace(/\s+(with|and)\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*(,|$)/g, "$1")
    .trim();
  return (raw.charAt(0).toUpperCase() + raw.slice(1)).slice(0, 80);
}

function itemFor(part: ChosenPart): string {
  const { food, amount } = part;
  if (food.unit === "piece") return amount === 1 ? food.name : `${food.name} x${amount}`;
  const unit = food.unit === "ml" ? "ml" : "g";
  return `${food.name} ${amount}${unit}${food.state ? ` ${food.state}` : ""}`;
}

/* ---------------------------------------------------------------- generate */

/**
 * What the week has eaten so far, so each day can steer away from it: the
 * same dish yesterday in the same slot is the repeat people notice most, and
 * a dish on most days of the week is the next.
 */
type WeekMemory = {
  yesterday: Map<Slot, { template: string; anchor: string }[]>;
  templateCount: Map<string, number>;
  anchorCount: Map<string, number>;
};

/**
 * `variety` scales the week's repeat penalties: 1 is full strength. Not eating
 * yesterday's plate again is held at full strength regardless, because that is
 * the repeat the Hunter actually asked not to see.
 */
function generateDay(input: DietInput, day: Macro4, memory: WeekMemory, variety = 1): Meal[] {
  const slots = schedule(input.kcal, input.gymStart, input.gymEnd);
  const totalShare = { p: 0, c: 0, f: 0, k: 0 };
  for (const s of slots) for (const key of KEYS) totalShare[key] += SHARE[s.slot][key];

  const usedAnchors = new Set<string>();
  const usedTemplates = new Set<string>();
  const meals: Meal[] = [];

  for (const s of slots) {
    const target = { p: 0, c: 0, f: 0, k: 0 };
    for (const key of KEYS) target[key] = (day[key] * SHARE[s.slot][key]) / totalShare[key];
    const yesterday = memory.yesterday.get(s.slot) ?? [];

    // Anchors eaten often this week are tried last, so a template can land on
    // a different protein before a different template is needed.
    const avoid = new Set([
      ...usedAnchors,
      ...(variety > 0 ? [...memory.anchorCount].filter(([, n]) => n >= 2).map(([id]) => id) : []),
    ]);

    let best: { meal: Meal; score: number } | null = null;
    for (const template of MEAL_TEMPLATES.filter((t) => t.slots.includes(s.slot))) {
      const parts = resolve(template, input.prefs, avoid);
      if (!parts) continue;
      const meal: Meal = { slot: s.slot, minutes: s.minutes, template, parts, target };
      solveMeal(meal);
      const anchor = parts[0].food;

      const repeatToday = (usedTemplates.has(template.id) ? 0.6 : 0) + (usedAnchors.has(anchor.id) ? 0.4 : 0);
      const sameAsYesterday = yesterday.some((y) => y.template === template.id) ? 0.8 : 0;
      const anchorYesterday = yesterday.some((y) => y.anchor === anchor.id) ? 0.25 : 0;
      const weekly = (memory.templateCount.get(template.id) ?? 0) * 0.4 + (memory.anchorCount.get(anchor.id) ?? 0) * 0.1;

      // A non-vegetarian should see meat or fish at a main meal, not a day of
      // dal that only happens to fit the numbers as well.
      const main = s.slot === "lunch" || s.slot === "dinner";
      const animal = anchor.diet === "meat" || anchor.diet === "egg";
      const preference = !input.prefs.vegetarian && main && !animal ? 0.35 : 0;

      const score = error(sum(parts), target) + repeatToday + sameAsYesterday + (anchorYesterday + weekly) * variety + preference;
      if (!best || score < best.score) best = { meal, score };
    }
    if (!best) continue;
    meals.push(best.meal);
    usedTemplates.add(best.meal.template.id);
    usedAnchors.add(best.meal.parts[0].food.id);
  }

  // Land the day on its targets, without letting any one meal drift far from
  // its own share.
  const dayScore = (ms: Meal[]) => {
    const t = { p: 0, c: 0, f: 0, k: 0 };
    for (const m of ms) {
      const sm = sum(m.parts);
      for (const key of KEYS) t[key] += sm[key];
    }
    // The day's totals are what the Hunter is held to. The per-meal term only
    // breaks ties, so one meal does not absorb the whole correction.
    return error(t, day) * 4 + ms.reduce((acc, m) => acc + error(sum(m.parts), m.target) * 0.02, 0);
  };
  refine(meals, dayScore, 300);
  return meals;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const satisfies readonly DayKey[];

export function generateDiet(input: DietInput): GeneratedDiet {
  portionScale = Math.min(2.2, Math.max(1, input.kcal / 2100));
  const day: Macro4 = { p: input.proteinG, c: input.carbsG, f: input.fatG, k: input.kcal };

  const memory: WeekMemory = { yesterday: new Map(), templateCount: new Map(), anchorCount: new Map() };
  const days = {} as Record<DayKey, MealDef[]>;
  const totals = {} as Record<DayKey, GeneratedDiet["average"]>;
  const allMeals: Meal[] = [];

  const totalOf = (ms: Meal[]) => {
    const t = { p: 0, c: 0, f: 0, k: 0 };
    for (const m of ms) {
      const sm = sum(m.parts);
      for (const k of KEYS) t[k] += sm[k];
    }
    return t;
  };

  for (const key of DAYS) {
    // Variety is worth having only while the day still hits its numbers. A day
    // that comes in short on protein or off on calories is rebuilt with the
    // week's repeat penalties weakened, then ignored.
    // Never all the way to zero: that reproduces the single best-fitting day,
    // which is exactly the week-on-repeat this exists to prevent. If no
    // attempt hits, keep the one closest to its numbers.
    let meals: Meal[] = [];
    let bestMiss = Infinity;
    for (const variety of [1, 0.6, 0.3, 0.1, 0]) {
      const attempt = generateDay(input, day, memory, variety);
      const t = totalOf(attempt);
      const miss = Math.max(0, day.p * 0.96 - t.p) / day.p + Math.max(0, Math.abs(t.k - day.k) - day.k * 0.04) / day.k;
      if (miss < bestMiss) {
        bestMiss = miss;
        meals = attempt;
      }
      if (miss === 0) break;
    }
    allMeals.push(...meals);

    memory.yesterday = new Map();
    for (const m of meals) {
      const list = memory.yesterday.get(m.slot) ?? [];
      list.push({ template: m.template.id, anchor: m.parts[0].food.id });
      memory.yesterday.set(m.slot, list);
      memory.templateCount.set(m.template.id, (memory.templateCount.get(m.template.id) ?? 0) + 1);
      memory.anchorCount.set(m.parts[0].food.id, (memory.anchorCount.get(m.parts[0].food.id) ?? 0) + 1);
    }

    days[key] = meals.map((m, i) => {
      const sm = sum(m.parts);
      return {
        // Unique across the week, so a meal id never means two different plates.
        id: `${key}-meal-${i + 1}`,
        time: toTime(m.minutes),
        name: nameFor(m),
        items: m.parts.filter((p) => p.amount > 0).map(itemFor).slice(0, 12),
        protein: Math.round(sm.p),
        carbs: Math.round(sm.c),
        fat: Math.round(sm.f),
        kcal: Math.round(sm.k),
        group: null,
      };
    });
    totals[key] = days[key].reduce(
      (t, m) => ({ protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat, kcal: t.kcal + m.kcal }),
      { protein: 0, carbs: 0, fat: 0, kcal: 0 },
    );
  }

  const avg = (k: keyof GeneratedDiet["average"]) => Math.round(DAYS.reduce((s, d) => s + totals[d][k], 0) / DAYS.length);
  return {
    days,
    totals,
    average: { protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat"), kcal: avg("kcal") },
    supplies: suppliesFor(allMeals),
  };
}

/** A week of the plan's ingredients, as a shopping list. */
function suppliesFor(meals: Meal[]): SupplyItem[] {
  const weekly = new Map<string, number>();
  // Every day of the week is its own plate now, so sum them rather than scale one.
  for (const m of meals) for (const p of m.parts) weekly.set(p.food.id, (weekly.get(p.food.id) ?? 0) + p.amount);

  const items: SupplyItem[] = [];
  for (const [id, amount] of weekly) {
    const food = FOOD_BY_ID[id];
    if (amount <= 0) continue;
    let qty: string;
    if (food.unit === "piece") qty = `${amount} ${food.pieceName ?? "pieces"}${amount === 1 ? "" : "s"}`;
    else if (food.unit === "ml") qty = amount >= 1000 ? `${(amount / 1000).toFixed(1)} L` : `${amount} ml`;
    else qty = amount >= 1000 ? `${(amount / 1000).toFixed(1)} kg` : `${amount} g`;
    items.push({ id: `supply-${items.length + 1}`, name: `${food.name}, ${qty}${food.state ? ` ${food.state}` : ""}`.slice(0, 60), checked: false });
  }
  return items.slice(0, 60);
}
