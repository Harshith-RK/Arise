/* ==========================================================================
   Food library.

   Macros are per 100 g, or per 100 ml for drinks, as eaten: "cooked" foods are
   weighed cooked. Values follow IFCT 2017 for Indian staples and USDA
   FoodData Central otherwise, to the precision a kitchen scale can act on.

   Calories are derived (4 / 4 / 9 per gram) rather than stored, so the macros a
   meal shows always add up to its calories. That slightly overstates
   high-fibre foods, which is the safe direction for a cut.
   ========================================================================== */

/** What a food is, in the ladder a diet choice excludes from. */
export type FoodDiet = "vegan" | "vegetarian" | "egg" | "meat";

/** The job a food does in a meal. The solver scales these, not "fixed". */
export type FoodRole = "protein" | "carb" | "fat" | "veg" | "fruit";

/**
 * Where a Hunter can buy it.
 *   everyday   any kirana, sabzi market or local meat shop, in any town
 *   city       mostly supermarkets and larger cities
 *   specialty  imported or health-store items
 */
export type Availability = "everyday" | "city" | "specialty";

export type Food = {
  id: string;
  name: string;
  /** Used when a dish name is built from what went into it. */
  short: string;
  role: FoodRole;
  per100: { p: number; c: number; f: number };
  diet: FoodDiet;
  unit: "g" | "ml" | "piece";
  /** For "piece" foods: grams in one piece, and what a piece is called. */
  pieceGrams?: number;
  pieceName?: string;
  /** Portion bounds in the food's unit (grams, ml or pieces), and the step it rounds to. */
  min: number;
  max: number;
  step: number;
  /** Suffix on the portion line, e.g. "cooked" or "dry". */
  state?: string;
  whey?: boolean;
  /** Excluded when a Hunter has high blood pressure. */
  highSodium?: boolean;
  /** Approximate Indian retail price, rupees per 100 g or ml as eaten. */
  inr: number;
  availability: Availability;
};

export const kcalPer100 = (f: Food) => f.per100.p * 4 + f.per100.c * 4 + f.per100.f * 9;

/** Grams in a portion expressed in the food's own unit. */
export const gramsOf = (f: Food, amount: number) => (f.unit === "piece" ? amount * (f.pieceGrams ?? 0) : amount);

type Row = [
  id: string,
  name: string,
  short: string,
  role: FoodRole,
  p: number,
  c: number,
  f: number,
  diet: FoodDiet,
  portion: [min: number, max: number, step: number],
  extra?: Partial<Pick<Food, "unit" | "pieceGrams" | "pieceName" | "state" | "whey" | "highSodium">>,
];

const piece = (grams: number, name: string): Partial<Food> => ({ unit: "piece", pieceGrams: grams, pieceName: name });
const ml: Partial<Food> = { unit: "ml" };
const cooked: Partial<Food> = { state: "cooked" };
const dry: Partial<Food> = { state: "dry" };

const ROWS: Row[] = [
  // ---- protein: dairy and plant
  ["paneer", "Paneer", "paneer", "protein", 18.3, 1.2, 20.8, "vegetarian", [50, 200, 10]],
  ["tofu", "Firm tofu", "tofu", "protein", 15.7, 2.3, 8.7, "vegan", [80, 300, 10]],
  ["soya-chunks", "Soya chunks", "soya", "protein", 52, 33, 0.5, "vegan", [20, 90, 5], dry],
  ["hung-curd", "Hung curd", "hung curd", "protein", 10, 4, 2, "vegetarian", [100, 300, 25]],
  ["curd", "Curd", "curd", "protein", 3.5, 4.5, 3.3, "vegetarian", [100, 300, 25]],
  ["milk", "Toned milk", "milk", "protein", 3.3, 4.8, 3, "vegetarian", [150, 400, 50], ml],
  ["skim-milk", "Skimmed milk", "milk", "protein", 3.4, 5, 0.2, "vegetarian", [150, 400, 50], ml],
  ["milk-powder", "Skimmed milk powder", "milk powder", "protein", 35, 52, 1, "vegetarian", [10, 40, 5]],
  ["soy-milk", "Unsweetened soy milk", "soy milk", "protein", 3.3, 1.8, 1.8, "vegan", [150, 400, 50], ml],
  ["whey", "Whey protein", "whey", "protein", 78, 8, 6, "vegetarian", [20, 45, 5], { whey: true }],
  ["tempeh", "Tempeh", "tempeh", "protein", 20, 7.6, 10.8, "vegan", [60, 200, 10]],
  ["edamame", "Edamame", "edamame", "protein", 11, 9, 5, "vegan", [80, 200, 10], cooked],
  ["dal", "Moong dal", "dal", "protein", 7, 18, 2, "vegan", [100, 300, 25], cooked],
  ["masoor", "Masoor dal", "masoor dal", "protein", 9, 20, 0.4, "vegan", [100, 300, 25], cooked],
  ["rajma", "Rajma", "rajma", "protein", 8.7, 22.8, 0.5, "vegan", [100, 300, 25], cooked],
  ["chana", "Chickpeas", "chana", "protein", 8.9, 27.4, 2.6, "vegan", [100, 250, 25], cooked],
  ["lobia", "Lobia", "lobia", "protein", 7.7, 21, 0.5, "vegan", [100, 250, 25], cooked],
  ["roasted-chana", "Roasted chana", "roasted chana", "protein", 22.5, 58, 5.2, "vegan", [15, 60, 5]],
  ["sprouts", "Sprouted moong", "sprouts", "protein", 5, 14, 0.5, "vegan", [80, 250, 10]],
  ["besan", "Besan", "besan", "protein", 22, 58, 6.7, "vegan", [30, 90, 5], dry],
  ["moong-flour", "Moong dal batter", "moong dal", "protein", 24, 59, 1.2, "vegan", [30, 90, 5], dry],
  ["makhana", "Roasted makhana", "makhana", "carb", 9.7, 77, 0.1, "vegan", [15, 50, 5]],
  ["murmura", "Murmura", "murmura", "carb", 7.5, 77, 0.5, "vegan", [20, 60, 5]],
  ["sattu", "Sattu", "sattu", "protein", 20.6, 60, 6.5, "vegan", [25, 70, 5]],
  ["hummus", "Hummus", "hummus", "protein", 8, 14, 10, "vegan", [40, 150, 10]],
  ["sambar", "Sambar", "sambar", "protein", 3, 8, 1.7, "vegan", [150, 300, 25]],

  // ---- protein: egg, meat, fish
  ["egg", "Whole egg", "egg", "protein", 12.6, 0.7, 9.5, "egg", [1, 4, 1], piece(50, "egg")],
  ["egg-white", "Egg white", "egg whites", "protein", 10.9, 0.7, 0.2, "egg", [2, 8, 1], piece(33, "white")],
  ["chicken-breast", "Chicken breast", "chicken", "protein", 31, 0, 3.6, "meat", [80, 250, 10], cooked],
  ["chicken-thigh", "Chicken thigh", "chicken thigh", "protein", 24, 0, 8, "meat", [80, 220, 10], cooked],
  ["fish", "Fish fillet", "fish", "protein", 22, 0, 3, "meat", [80, 250, 10], cooked],
  ["prawns", "Prawns", "prawns", "protein", 24, 0.2, 0.3, "meat", [80, 220, 10], cooked],
  ["tuna", "Tuna in water", "tuna", "protein", 25, 0, 1, "meat", [60, 160, 10], { highSodium: true }],
  ["mutton", "Lean mutton", "mutton", "protein", 25, 0, 9, "meat", [80, 200, 10], cooked],

  // ---- carbohydrate
  ["rice", "Rice", "rice", "carb", 2.7, 28, 0.3, "vegan", [75, 300, 25], cooked],
  ["brown-rice", "Brown rice", "brown rice", "carb", 2.6, 23, 0.9, "vegan", [75, 300, 25], cooked],
  ["roti", "Whole wheat roti", "roti", "carb", 9.8, 46, 3.7, "vegan", [1, 4, 1], piece(40, "roti")],
  ["jowar-roti", "Jowar roti", "jowar roti", "carb", 8.5, 56, 2, "vegan", [1, 4, 1], piece(40, "roti")],
  ["oats", "Rolled oats", "oats", "carb", 13, 68, 6.5, "vegan", [30, 90, 5], dry],
  ["poha", "Poha", "poha", "carb", 6.6, 77, 1.2, "vegan", [30, 90, 5], dry],
  ["rava", "Rava", "upma", "carb", 12.7, 73, 1, "vegan", [30, 80, 5], dry],
  ["dalia", "Dalia", "dalia", "carb", 12, 69, 1.5, "vegan", [30, 80, 5], dry],
  ["idli", "Idli", "idli", "carb", 4, 25, 0.4, "vegan", [2, 5, 1], piece(50, "idli")],
  ["dosa", "Plain dosa", "dosa", "carb", 3.9, 29, 3.7, "vegan", [1, 3, 1], piece(80, "dosa")],
  ["quinoa", "Quinoa", "quinoa", "carb", 4.4, 21, 1.9, "vegan", [75, 250, 25], cooked],
  ["sweet-potato", "Sweet potato", "sweet potato", "carb", 1.4, 20, 0.1, "vegan", [100, 300, 25], cooked],
  ["potato", "Potato", "potato", "carb", 1.9, 20, 0.1, "vegan", [100, 300, 25], cooked],
  ["bread", "Whole wheat bread", "toast", "carb", 13, 43, 3.4, "vegan", [1, 4, 1], piece(30, "slice")],
  ["corn", "Sweet corn", "corn", "carb", 3.4, 21, 1.5, "vegan", [50, 200, 25], cooked],
  ["honey", "Honey", "honey", "carb", 0.3, 82, 0, "vegetarian", [5, 25, 5]],
  ["jaggery", "Jaggery", "jaggery", "carb", 0.4, 98, 0.1, "vegan", [5, 20, 5]],

  // ---- fruit
  ["banana", "Banana", "banana", "fruit", 1.1, 23, 0.3, "vegan", [1, 2, 1], piece(118, "banana")],
  ["apple", "Apple", "apple", "fruit", 0.3, 14, 0.2, "vegan", [1, 2, 1], piece(180, "apple")],
  ["orange", "Orange", "orange", "fruit", 0.9, 12, 0.1, "vegan", [1, 2, 1], piece(130, "orange")],
  ["guava", "Guava", "guava", "fruit", 2.6, 14, 1, "vegan", [1, 2, 1], piece(100, "guava")],
  ["papaya", "Papaya", "papaya", "fruit", 0.5, 11, 0.3, "vegan", [100, 300, 50]],
  ["dates", "Dates", "dates", "fruit", 2.5, 75, 0.4, "vegan", [2, 6, 1], piece(8, "date")],

  // ---- vegetables
  ["mixed-veg", "Mixed vegetable sabzi", "sabzi", "veg", 2.5, 9, 3, "vegan", [80, 250, 10]],
  ["palak", "Palak", "palak", "veg", 3, 4, 0.3, "vegan", [80, 250, 10], cooked],
  ["salad", "Cucumber, tomato and onion salad", "salad", "veg", 1, 4.5, 0.2, "vegan", [80, 250, 10]],
  ["broccoli", "Broccoli", "broccoli", "veg", 2.4, 7, 0.4, "vegan", [80, 250, 10], cooked],
  ["mushroom", "Mushrooms", "mushrooms", "veg", 3.6, 4, 3, "vegan", [80, 200, 10], cooked],
  ["bhindi", "Bhindi sabzi", "bhindi", "veg", 2, 8, 5, "vegan", [80, 200, 10]],

  // ---- fats
  ["ghee", "Ghee", "ghee", "fat", 0, 0, 99.8, "vegetarian", [0, 15, 5]],
  ["oil", "Cooking oil", "oil", "fat", 0, 0, 100, "vegan", [0, 15, 5]],
  ["olive-oil", "Olive oil", "olive oil", "fat", 0, 0, 100, "vegan", [0, 15, 5]],
  ["peanuts", "Peanuts", "peanuts", "fat", 25.8, 16, 49, "vegan", [10, 40, 5]],
  ["peanut-butter", "Peanut butter", "peanut butter", "fat", 25, 20, 50, "vegan", [10, 32, 4]],
  ["almonds", "Almonds", "almonds", "fat", 21, 22, 50, "vegan", [10, 30, 5]],
  ["walnuts", "Walnuts", "walnuts", "fat", 15, 14, 65, "vegan", [10, 30, 5]],
  ["chia", "Chia seeds", "chia", "fat", 17, 42, 31, "vegan", [5, 25, 5]],
  ["flax", "Flaxseed", "flax", "fat", 18, 29, 42, "vegan", [5, 25, 5]],
  ["pumpkin-seeds", "Pumpkin seeds", "pumpkin seeds", "fat", 30, 11, 49, "vegan", [10, 30, 5]],
  ["coconut", "Fresh coconut", "coconut", "fat", 3.3, 15, 33, "vegan", [15, 50, 5]],

  // ---- drinks
  ["buttermilk", "Buttermilk", "chaas", "protein", 1.5, 2, 0.9, "vegetarian", [200, 400, 50], ml],
];

/*
 * Price and availability, per 100 g or ml as eaten.
 *
 * Typical Indian retail in 2026, from kirana, sabzi market and local meat shop
 * prices rather than supermarkets. Cooked foods are priced from their dry
 * weight (100 g cooked dal is about 33 g dry), a roti from its atta. They vary
 * by city and season; they are here to rank foods and give an honest ballpark,
 * not to be a price list.
 */
const PRICE: Record<string, [inr: number, availability: Availability]> = {
  // dairy and plant protein
  paneer: [40, "everyday"],
  tofu: [35, "city"],
  "soya-chunks": [18, "everyday"],
  "hung-curd": [16, "everyday"], // curd strained at home, about 2 kg curd to 1 kg
  curd: [7, "everyday"],
  milk: [5.6, "everyday"],
  "skim-milk": [5, "everyday"],
  // Sold loose and in Amul or Sagar packs at most kiranas. Cheaper per gram of
  // protein than paneer, and the answer for a vegetarian with no eggs or whey.
  "milk-powder": [45, "everyday"],
  "soy-milk": [15, "city"],
  whey: [280, "city"],
  tempeh: [80, "specialty"],
  edamame: [50, "specialty"],
  dal: [4, "everyday"],
  masoor: [3.5, "everyday"],
  rajma: [6, "everyday"],
  chana: [4, "everyday"],
  lobia: [5, "everyday"],
  "roasted-chana": [14, "everyday"],
  sprouts: [6, "everyday"],
  besan: [10, "everyday"],
  "moong-flour": [12, "everyday"],
  makhana: [100, "city"],
  hummus: [90, "specialty"],
  sambar: [4, "everyday"],
  murmura: [8, "everyday"],
  sattu: [12, "everyday"],
  // egg, meat, fish
  egg: [14, "everyday"],
  "egg-white": [21, "everyday"],
  "chicken-breast": [43, "everyday"],
  "chicken-thigh": [32, "everyday"],
  fish: [31, "everyday"],
  prawns: [75, "city"],
  tuna: [97, "specialty"],
  mutton: [107, "everyday"],
  // carbohydrate
  rice: [1.7, "everyday"],
  "brown-rice": [4.5, "city"],
  roti: [4, "everyday"],
  "jowar-roti": [5, "everyday"],
  oats: [18, "everyday"],
  poha: [6, "everyday"],
  rava: [5, "everyday"],
  dalia: [6, "everyday"],
  idli: [8, "everyday"],
  dosa: [8, "everyday"],
  quinoa: [20, "specialty"],
  "sweet-potato": [6, "everyday"],
  potato: [3, "everyday"],
  bread: [12.5, "everyday"],
  corn: [8, "everyday"],
  honey: [40, "everyday"],
  jaggery: [6, "everyday"],
  // fruit
  banana: [3.5, "everyday"],
  apple: [18, "everyday"],
  orange: [8, "everyday"],
  guava: [8, "everyday"],
  papaya: [4, "everyday"],
  dates: [30, "everyday"],
  // vegetables
  "mixed-veg": [5, "everyday"],
  palak: [4, "everyday"],
  salad: [4, "everyday"],
  broccoli: [30, "specialty"],
  mushroom: [25, "city"],
  bhindi: [6, "everyday"],
  // fats
  ghee: [65, "everyday"],
  oil: [16, "everyday"],
  "olive-oil": [100, "specialty"],
  peanuts: [14, "everyday"],
  "peanut-butter": [35, "city"],
  almonds: [90, "everyday"],
  walnuts: [120, "city"],
  chia: [50, "city"],
  flax: [20, "everyday"],
  "pumpkin-seeds": [90, "specialty"],
  coconut: [13, "everyday"],
  // drinks
  buttermilk: [3, "everyday"],
};

export const FOODS: Food[] = ROWS.map(([id, name, short, role, p, c, f, diet, [min, max, step], extra]) => {
  const [inr, availability] = PRICE[id] ?? [Number.NaN, "specialty"];
  return {
    id,
    name,
    short,
    role,
    per100: { p, c, f },
    diet,
    unit: "g" as const,
    min,
    max,
    step,
    inr,
    availability,
    ...extra,
  };
});

/**
 * Most of a food anyone should be given in a day, in grams as listed. Cheap is
 * not the same as fine in any amount: left alone, a budget plan fills protein
 * with soya chunks and calories with oil, well past sensible amounts.
 */
export const DAILY_MAX_GRAMS: Record<string, number> = {
  "soya-chunks": 60, // dry; a common guideline is 30 to 60 g a day
  oil: 30,
  ghee: 15,
  jaggery: 25,
  honey: 25,
  "milk-powder": 50,
  whey: 60, // two scoops
};

/** Rupees for a portion in the food's own unit. */
export const costOf = (f: Food, amount: number) => (gramsOf(f, amount) * f.inr) / 100;

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export type DietPrefs = {
  vegetarian: boolean;
  noEggs: boolean;
  noWhey: boolean;
  /** Hypertension excludes high-sodium foods. */
  lowSodium: boolean;
};

/**
 * Whether a food fits a Hunter's diet and can be bought anywhere.
 *
 * Plans use only what a kirana, sabzi market or local meat shop sells, so they
 * work in any town and on a gym-goer's budget. Whey is the one exception, and
 * only for a Hunter who said they take it: they already buy it.
 */
export function allowed(food: Food, prefs: DietPrefs): boolean {
  if (food.availability !== "everyday" && !(food.whey && !prefs.noWhey)) return false;
  if (food.diet === "meat" && prefs.vegetarian) return false;
  // Vegetarian and "no eggs" are separate choices: a vegetarian who eats eggs is common.
  if (food.diet === "egg" && prefs.noEggs) return false;
  if (food.whey && prefs.noWhey) return false;
  if (food.highSodium && prefs.lowSodium) return false;
  return true;
}
