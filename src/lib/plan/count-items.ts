import { FOODS, gramsOf, type Food } from "./library/foods";
import type { Macros } from "@/lib/engine/types";

/* ==========================================================================
   Counting a meal from what is in it.

   A meal written by hand is a line of items: "Paneer 100g, Roti x2". The food
   library already knows what 100 g of paneer is, so the macros are arithmetic
   rather than something a Hunter should have to look up and type. Anything the
   library does not recognize is reported rather than guessed at, because a
   silent zero would quietly shrink the day's numbers.
   ========================================================================== */

/** Words that describe how a food was prepared, not what it is. */
const STATE_WORDS = ["cooked", "raw", "dry", "boiled", "uncooked", "soaked"];

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[(),.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Longest names first, so "milk powder" wins over "milk". */
const SEARCH: { food: Food; term: string }[] = FOODS.flatMap((food) =>
  [food.name, food.short].map((term) => ({ food, term: clean(term) })),
).sort((a, b) => b.term.length - a.term.length);

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

/**
 * One item line. Reads "Paneer 100 g", "100g paneer", "Roti x2", "Milk 200ml"
 * and a bare "Banana", which is one piece of it.
 */
export function countItem(text: string): CountedItem {
  const raw = clean(text);
  if (!raw) return { text, food: null, amount: 0, macros: NOTHING, problem: "unknown food" };

  // The amount, in whichever way it was written.
  let amount: number | null = null;
  let rest = raw;
  const weight = rest.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|ml|l|litre|litres)\b/);
  const pieces = rest.match(/(?:^|\s)x\s*(\d+(?:\.\d+)?)(?:\s|$)|(?:^|\s)(\d+(?:\.\d+)?)\s*(?:pc|pcs|piece|pieces|nos?)\b/);
  if (weight) {
    const n = Number(weight[1]);
    const unit = weight[2];
    amount = unit === "kg" || unit === "l" || unit.startsWith("litre") ? n * 1000 : n;
    rest = rest.replace(weight[0], " ");
  } else if (pieces) {
    amount = Number(pieces[1] ?? pieces[2]);
    rest = rest.replace(pieces[0], " ");
  } else {
    const bare = rest.match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/);
    if (bare) {
      amount = Number(bare[1]);
      rest = rest.replace(bare[0], " ");
    }
  }
  for (const w of STATE_WORDS) rest = rest.replace(new RegExp(`\\b${w}\\b`, "g"), " ");
  rest = rest.replace(/\s+/g, " ").trim();

  const hit = SEARCH.find(({ term }) => rest === term || rest.includes(term));
  if (!hit) return { text, food: null, amount: 0, macros: NOTHING, problem: "unknown food" };

  const food = hit.food;
  // A piece food counts as one piece when no number is given. A food weighed in
  // grams cannot be guessed at, so it says so instead.
  if (amount === null) {
    if (food.unit !== "piece") return { text, food, amount: 0, macros: NOTHING, problem: "no amount" };
    amount = 1;
  }
  // A number written next to a piece food is a count of pieces, not grams,
  // unless it is large enough that grams is the only reading that makes sense.
  if (food.unit === "piece" && weight) amount = amount / (food.pieceGrams ?? 1);

  return { text, food, amount, macros: macrosFor(food, amount), problem: null };
}

export type CountedMeal = {
  items: CountedItem[];
  macros: Macros;
  /** The item lines the library could not count, in the words they were typed. */
  uncounted: string[];
};

/** Every item of a meal, and what they add up to. */
export function countItems(items: string[]): CountedMeal {
  const counted = items.map(countItem);
  const sum = counted.reduce(
    (t, i) => ({
      protein: t.protein + i.macros.protein,
      carbs: t.carbs + i.macros.carbs,
      fat: t.fat + i.macros.fat,
      kcal: t.kcal + i.macros.kcal,
    }),
    NOTHING,
  );
  return {
    items: counted,
    macros: {
      protein: Math.round(sum.protein),
      carbs: Math.round(sum.carbs),
      fat: Math.round(sum.fat),
      kcal: Math.round(sum.kcal),
    },
    uncounted: counted.filter((i) => i.problem).map((i) => i.text),
  };
}
