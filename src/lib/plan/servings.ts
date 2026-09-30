import type { Food } from "./library/foods";

/* ==========================================================================
   Household measures, and the names people actually type.

   Nobody weighs a katori of dal. A meal written by hand says "1 bowl dal" or
   "2 chapati", so the counter has to know roughly what those weigh before it
   can turn them into macros. The figures below are ordinary Indian kitchen
   servings, as eaten. They are approximations by nature, which is the honest
   trade: a katori counted at 150 g is far closer than a katori counted as one
   gram, and far more useful than refusing to count it at all.
   ========================================================================== */

export const MEASURES = [
  "katori", "bowl", "cup", "glass", "spoon", "tsp", "scoop", "slice", "handful", "plate",
] as const;
export type Measure = (typeof MEASURES)[number];

/** What each written form means. */
export const MEASURE_WORDS: Record<string, Measure> = {
  katori: "katori", katoris: "katori", vati: "katori",
  bowl: "bowl", bowls: "bowl", katora: "bowl",
  cup: "cup", cups: "cup",
  glass: "glass", glasses: "glass", tumbler: "glass",
  spoon: "spoon", spoons: "spoon", tbsp: "spoon", tablespoon: "spoon", tablespoons: "spoon", chamach: "spoon",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  scoop: "scoop", scoops: "scoop",
  slice: "slice", slices: "slice",
  handful: "handful", handfuls: "handful", mutthi: "handful",
  plate: "plate", plates: "plate",
};

type Table = Partial<Record<Measure, number>>;

/** Drinks and anything else poured. */
const POURED: Table = { glass: 250, cup: 200, bowl: 200, katori: 150, spoon: 15, tsp: 5 };
/** Curd and the like: spooned, not poured, so a cup holds a little more. */
const SPOONED: Table = { glass: 250, cup: 200, bowl: 200, katori: 150, spoon: 20, tsp: 7 };
/** Cooked grains and pulses, as served. */
const COOKED: Table = { katori: 150, bowl: 200, cup: 150, plate: 300, spoon: 20 };
/** Sabzi and greens, which sit lighter in the same katori. */
const VEG: Table = { katori: 100, bowl: 120, cup: 100, spoon: 15 };
/** Flours, oats and anything measured dry. */
const DRY: Table = { cup: 80, katori: 50, bowl: 60, spoon: 12, tsp: 4, handful: 20 };
/** Oils, ghee, nut butters, honey and jaggery. */
const RICH: Table = { spoon: 15, tsp: 5, cup: 200, katori: 150 };
/** Nuts and seeds. */
const NUTS: Table = { handful: 25, spoon: 10, tsp: 4, katori: 40, bowl: 50, cup: 60 };

const BY_ID: Record<string, Table> = {
  whey: { scoop: 30, spoon: 10 },
  "milk-powder": { scoop: 25, spoon: 12, tsp: 4 },
  bread: { slice: 30 },
  murmura: { bowl: 25, katori: 20, cup: 20, handful: 10, plate: 40 },
  makhana: { bowl: 20, katori: 15, cup: 15, handful: 8 },
  "roasted-chana": { katori: 40, bowl: 50, cup: 50, handful: 25, spoon: 12 },
  honey: RICH,
  jaggery: RICH,
  hummus: { spoon: 30, katori: 60, bowl: 80, cup: 80 },
  sambar: POURED,
  buttermilk: POURED,
  salad: { katori: 80, bowl: 100, cup: 80, plate: 150 },
  corn: { katori: 100, bowl: 120, cup: 120 },
  sprouts: { katori: 80, bowl: 100, cup: 100, handful: 30 },
  potato: COOKED,
  "sweet-potato": COOKED,
};

const BY_ROLE: Record<Food["role"], Table> = {
  protein: COOKED,
  carb: COOKED,
  veg: VEG,
  fruit: { katori: 120, bowl: 150, cup: 120 },
  fat: NUTS,
};

/** Dry staples that are measured before cooking, so the dry table applies. */
const DRY_IDS = new Set(["oats", "rava", "dalia", "besan", "sattu", "moong-flour", "soya-chunks", "quinoa", "chia", "flax"]);
/** Poured or spooned dairy, whatever unit the library stores them in. */
const POURED_IDS = new Set(["milk", "skim-milk", "soy-milk"]);
const SPOONED_IDS = new Set(["curd", "hung-curd"]);
const RICH_IDS = new Set(["oil", "olive-oil", "ghee", "peanut-butter", "coconut"]);

/** What one of `measure` weighs for this food, in grams, or null if it makes no sense. */
export function measureGrams(food: Food, measure: Measure): number | null {
  // A food counted in pieces already names its own: a slice of bread, a roti.
  if (food.unit === "piece" && food.pieceName && measure === food.pieceName) return food.pieceGrams ?? null;
  const table =
    BY_ID[food.id] ??
    (POURED_IDS.has(food.id) || food.unit === "ml"
      ? POURED
      : SPOONED_IDS.has(food.id)
        ? SPOONED
        : RICH_IDS.has(food.id)
          ? RICH
          : DRY_IDS.has(food.id)
            ? DRY
            : BY_ROLE[food.role]);
  return table[measure] ?? null;
}

/**
 * Other names for the same food: the Hindi word, the regional spelling, the
 * shop label. Written the way they are typed, lower case.
 */
export const ALIASES: Record<string, string> = {
  chapati: "roti", chapatti: "roti", chappati: "roti", phulka: "roti", rotis: "roti", chapatis: "roti", atta: "roti",
  chawal: "rice", bhat: "rice", "white rice": "rice", "basmati rice": "rice", steamed: "rice",
  "red rice": "brown-rice", "brown chawal": "brown-rice",
  dahi: "curd", yogurt: "curd", yoghurt: "curd", "greek yogurt": "hung-curd", "greek yoghurt": "hung-curd",
  doodh: "milk", "toned milk": "milk", "full cream milk": "milk", "cow milk": "milk",
  chaas: "buttermilk", lassi: "buttermilk", "salted lassi": "buttermilk",
  anda: "egg", ande: "egg", eggs: "egg", "boiled egg": "egg", omelette: "egg", omelet: "egg", bhurji: "egg",
  "egg whites": "egg-white",
  chicken: "chicken-breast", murgh: "chicken-breast", "grilled chicken": "chicken-breast", "chicken curry": "chicken-breast",
  daal: "dal", "dal fry": "dal", "moong dal": "dal", "toor dal": "dal", "tur dal": "dal", "arhar dal": "dal", "yellow dal": "dal",
  chole: "chana", chhole: "chana", "kabuli chana": "chana", chickpea: "chana", "white chana": "chana",
  "kidney beans": "rajma", "rajma curry": "rajma",
  aloo: "potato", "aloo sabzi": "potato", shakarkandi: "sweet-potato",
  sabzi: "mixed-veg", sabji: "mixed-veg", bhaji: "mixed-veg", "mixed veg": "mixed-veg",
  spinach: "palak", "palak sabzi": "palak",
  okra: "bhindi", "lady finger": "bhindi",
  "soya chunk": "soya-chunks", soyabean: "soya-chunks", nutrela: "soya-chunks", "meal maker": "soya-chunks",
  moongphali: "peanuts", groundnut: "peanuts", groundnuts: "peanuts", "peanut": "peanuts",
  badam: "almonds", almond: "almonds", akhrot: "walnuts", walnut: "walnuts",
  gud: "jaggery", shahad: "honey",
  tel: "oil", "refined oil": "oil", "mustard oil": "oil", "sunflower oil": "oil", butter: "ghee",
  idly: "idli", idlis: "idli", dosai: "dosa", dosas: "dosa",
  upma: "rava", suji: "rava", sooji: "rava", semolina: "rava",
  oatmeal: "oats", "oats porridge": "oats",
  "protein powder": "whey", "protein shake": "whey", "whey scoop": "whey",
  "brown bread": "bread", "multigrain bread": "bread", toast: "bread", "bread slice": "bread",
  kela: "banana", seb: "apple", papita: "papaya", amrood: "guava", khajoor: "dates",
  machli: "fish", fish: "fish", jhinga: "prawns", "mutton curry": "mutton",
  "paneer bhurji": "paneer", "paneer curry": "paneer", "paneer sabzi": "paneer", "paneer tikka": "paneer",
  "curd rice": "curd", chana: "chana",
};
