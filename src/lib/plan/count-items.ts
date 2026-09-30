import { FOODS, FOOD_BY_ID, gramsOf, type Food } from "./library/foods";
import { ALIASES, MEASURE_WORDS, measureGrams, type Measure } from "./servings";
import type { Macros } from "@/lib/engine/types";

/* ==========================================================================
   Counting a meal from what is in it.

   A meal written by hand is a line of items: "Paneer 100g", "2 chapati",
   "1 katori dal", "whey scoop". The food library knows what 100 g of each food
   is and servings.ts knows what a katori weighs, so the macros are arithmetic
   rather than something a Hunter should have to look up and type.

   Two rules hold the whole thing honest. Anything the library does not know is
   reported, never guessed at, because a silent zero would quietly shrink the
   day. And an amount it cannot read is reported too, rather than being taken as
   grams: "1 bowl dal" counted as one gram is worse than not counting it.
   ========================================================================== */

/** Words that describe how a food was prepared, not what it is. */
const STATE_WORDS = ["cooked", "raw", "dry", "boiled", "uncooked", "soaked", "steamed", "grilled", "roasted", "fresh", "plain"];

/** Noise between two foods on one line: "oats with milk". */
const JOINERS = /\s+(?:with|and|plus|&|\+)\s+/g;

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[(),.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Every name a food answers to: its label, its short form, its id and its aliases. */
const SEARCH: { food: Food; term: string }[] = [
  ...FOODS.flatMap((food) =>
    [food.name, food.short, food.id.replace(/-/g, " ")].map((term) => ({ food, term: clean(term) })),
  ),
  ...Object.entries(ALIASES).flatMap(([term, id]) => {
    const food = FOOD_BY_ID[id];
    return food ? [{ food, term: clean(term) }] : [];
  }),
];

const holds = (haystack: string, needle: string) => new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);

/**
 * The food a written phrase means. Tried in order of certainty: the exact
 * words, then the longest library name inside the phrase ("brown rice" beats
 * "rice"), then the shortest name the phrase sits inside, so a bare "bread"
 * finds "Whole wheat bread" without "milk" dragging in "soy milk".
 */
function findFood(rest: string): Food | null {
  const exact = SEARCH.find((s) => s.term === rest);
  if (exact) return exact.food;
  const inside = SEARCH.filter((s) => holds(rest, s.term)).sort((a, b) => b.term.length - a.term.length);
  if (inside.length) return inside[0].food;
  const around = SEARCH.filter((s) => holds(s.term, rest)).sort((a, b) => a.term.length - b.term.length);
  return around.length ? around[0].food : null;
}

export type CountedItem = {
  text: string;
  food: Food | null;
  /** In the food's own unit: grams, millilitres or pieces. */
  amount: number;
  macros: Macros;
  /** Why it could not be counted, when it could not. */
  problem: "unknown food" | "no amount" | null;
};

function macrosFor(food: Food, amount: number): Macros {
  const g = gramsOf(food, amount) / 100;
  const protein = food.per100.p * g;
  const carbs = food.per100.c * g;
  const fat = food.per100.f * g;
  return { protein, carbs, fat, kcal: protein * 4 + carbs * 4 + fat * 9 };
}

const NOTHING: Macros = { protein: 0, carbs: 0, fat: 0, kcal: 0 };
const none = (text: string, food: Food | null, problem: CountedItem["problem"]): CountedItem =>
  ({ text, food, amount: 0, macros: NOTHING, problem });

/** "1/2" and "half" are how half a katori actually gets written. */
function readNumber(raw: string): { value: number; token: string } | null {
  const fraction = raw.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)(?=\s|$)/);
  if (fraction) return { value: Number(fraction[1]) / Number(fraction[2]), token: fraction[0] };
  const half = raw.match(/(?:^|\s)(half|aadha|adha)(?=\s|$)/);
  if (half) return { value: 0.5, token: half[0] };
  const plain = raw.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
  return plain ? { value: Number(plain[1]), token: plain[0] } : null;
}

/**
 * One food and its amount. Reads "Paneer 100 g", "100g paneer", "Roti x2",
 * "Milk 200ml", "1 katori dal", "half cup curd", "whey scoop", and a bare
 * "Banana", which is one piece of it.
 */
function countOne(text: string): CountedItem {
  const raw = clean(text);
  if (!raw) return none(text, null, "unknown food");

  let amount: number | null = null;
  let weighed = false;
  let rest = raw;

  const weight = rest.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams|ml|l|litre|litres)\b/);
  const pieces = rest.match(/(?:^|\s)x\s*(\d+(?:\.\d+)?)(?:\s|$)|(?:^|\s)(\d+(?:\.\d+)?)\s*(?:pc|pcs|piece|pieces|nos?)\b/);
  const measureWord = rest.match(new RegExp(`(?:^|\\s)(${Object.keys(MEASURE_WORDS).join("|")})(?=\\s|$)`));

  if (weight) {
    const n = Number(weight[1]);
    const unit = weight[2];
    amount = unit === "kg" || unit === "l" || unit.startsWith("litre") ? n * 1000 : n;
    weighed = true;
    rest = rest.replace(weight[0], " ");
  } else if (pieces) {
    amount = Number(pieces[1] ?? pieces[2]);
    rest = rest.replace(pieces[0], " ");
  }

  // A measure is resolved after the food is known, since a katori of dal and a
  // katori of oats do not weigh the same.
  let measure: Measure | null = null;
  let count = 1;
  if (amount === null && measureWord) {
    measure = MEASURE_WORDS[measureWord[1]];
    rest = rest.replace(measureWord[0], " ");
    const n = readNumber(rest);
    if (n) {
      count = n.value;
      rest = rest.replace(n.token, " ");
    }
  } else if (amount === null) {
    const n = readNumber(rest);
    if (n) {
      amount = n.value;
      rest = rest.replace(n.token, " ");
    }
  }

  rest = rest.replace(/\s+/g, " ").trim();
  let plain = rest;
  for (const w of STATE_WORDS) plain = plain.replace(new RegExp(`\\b${w}\\b`, "g"), " ");
  plain = plain.replace(/\s+/g, " ").trim();

  // As written first: "roasted chana" is its own food, not chana prepared a
  // certain way. Only then without the preparation words.
  const food = findFood(rest) ?? findFood(plain);
  if (!food) return none(text, null, "unknown food");

  if (measure) {
    const grams = measureGrams(food, measure);
    // A measure this food has no sense of, such as a slice of dal.
    if (grams === null) return none(text, food, "no amount");
    amount = food.unit === "piece" ? (grams * count) / (food.pieceGrams ?? 1) : grams * count;
  }

  // A piece food counts as one piece when no number is given. A food weighed in
  // grams cannot be guessed at, so it says so instead.
  if (amount === null) {
    if (food.unit !== "piece") return none(text, food, "no amount");
    amount = 1;
  }
  // Grams written next to a piece food are grams, not a count of pieces.
  if (food.unit === "piece" && weighed) amount = amount / (food.pieceGrams ?? 1);

  return { text, food, amount, macros: macrosFor(food, amount), problem: null };
}

const add = (a: Macros, b: Macros): Macros => ({
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
  kcal: a.kcal + b.kcal,
});

/**
 * One item line, which may hold more than one food: "oats 50g with milk 200ml".
 * The line counts only if every food on it counts.
 */
export function countItem(text: string): CountedItem {
  const parts = text.split(JOINERS).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return countOne(text);

  const counted = parts.map(countOne);
  const failed = counted.find((c) => c.problem);
  if (failed) {
    // "and" joins two foods, but it also sits inside a dish's own name
    // ("cucumber, tomato and onion salad"). When the parts point at one food
    // at most, the line is a name and is read whole again. When they point at
    // two, reading it whole would count one and quietly drop the other, so the
    // line reports what it is missing instead.
    const named = new Set(counted.map((c) => c.food?.id).filter(Boolean));
    if (named.size <= 1) return countOne(text);
    return none(text, failed.food, counted.find((c) => c.problem === "no amount")?.problem ?? failed.problem);
  }
  return {
    text,
    food: counted[0].food,
    amount: counted[0].amount,
    macros: counted.reduce((t, c) => add(t, c.macros), NOTHING),
    problem: null,
  };
}

export type CountedMeal = {
  items: CountedItem[];
  macros: Macros;
  /** The item lines the library could not count, in the words they were typed. */
  uncounted: string[];
  /** Those it knows the food for but not how much: they need an amount. */
  needAmount: string[];
};

/** Every item of a meal, and what they add up to. */
export function countItems(items: string[]): CountedMeal {
  const counted = items.map(countItem);
  const sum = counted.reduce((t, i) => add(t, i.macros), NOTHING);
  return {
    items: counted,
    macros: {
      protein: Math.round(sum.protein),
      carbs: Math.round(sum.carbs),
      fat: Math.round(sum.fat),
      kcal: Math.round(sum.kcal),
    },
    uncounted: counted.filter((i) => i.problem).map((i) => i.text),
    needAmount: counted.filter((i) => i.problem === "no amount").map((i) => i.text),
  };
}
