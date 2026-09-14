/* ==========================================================================
   Meal templates.

   A template is a dish shape, not a fixed recipe: each component lists the
   foods that can fill it, in order of preference, and the generator takes the
   first one a Hunter's diet allows. So "a protein with rice and dal" becomes
   chicken for one person and paneer for another, from the same template.

   `scale: true` components are solved for grams to hit the meal's macros.
   Fixed components (vegetables, most fruit) keep their default portion.
   ========================================================================== */

export type Slot = "breakfast" | "lunch" | "dinner" | "snack" | "pre" | "post";

export type Component = {
  foods: string[];
  scale: boolean;
  /** Starting portion in the food's unit, used as-is when not scaled. */
  amount: number;
  /** A template with a missing optional component still works. */
  optional?: boolean;
};

export type MealTemplate = {
  id: string;
  slots: Slot[];
  /** Dish name. `{0}`, `{1}` ... are replaced with the chosen foods' short names. */
  name: string;
  components: Component[];
};

const c = (foods: string[], amount: number, scale = true, optional = false): Component => ({
  foods,
  amount,
  scale,
  optional,
});

const MAIN_PROTEIN = ["chicken-breast", "fish", "paneer", "tofu", "soya-chunks"];
const CURRY_PROTEIN = ["chicken-thigh", "prawns", "mutton", "paneer", "chana", "tofu"];

export const MEAL_TEMPLATES: MealTemplate[] = [
  // ---- breakfast
  { id: "chilla", slots: ["breakfast"], name: "Besan chilla with {1}", components: [c(["besan"], 50), c(["hung-curd", "curd", "soy-milk"], 150), c(["oil"], 5), c(["salad"], 80, false, true)] },
  { id: "oats-bowl", slots: ["breakfast", "pre"], name: "Oats with {1} and {3}", components: [c(["oats"], 50), c(["skim-milk", "soy-milk", "milk"], 250), c(["whey"], 25, true, true), c(["banana"], 1), c(["peanut-butter", "almonds", "chia"], 12, true, true)] },
  { id: "eggs-toast", slots: ["breakfast", "post"], name: "{0}s on toast", components: [c(["egg", "egg-white"], 3), c(["bread"], 2), c(["egg-white"], 3, true, true), c(["salad"], 80, false, true)] },
  { id: "poha", slots: ["breakfast"], name: "Poha with {2}", components: [c(["poha"], 50), c(["mixed-veg"], 80, false), c(["hung-curd", "curd", "tofu"], 150), c(["peanuts", "oil"], 15)] },
  { id: "idli", slots: ["breakfast"], name: "Idli, sambar and {2}", components: [c(["idli"], 3), c(["sambar"], 200), c(["curd", "hung-curd", "tofu"], 150), c(["coconut", "peanuts"], 15, true, true)] },
  { id: "bhurji", slots: ["breakfast", "dinner"], name: "{0} bhurji with {1}", components: [c(["egg", "paneer", "tofu"], 150), c(["roti", "bread"], 2), c(["mixed-veg"], 80, false), c(["oil"], 5)] },
  { id: "upma", slots: ["breakfast"], name: "Upma with {2}", components: [c(["rava", "dalia"], 50), c(["mixed-veg"], 80, false), c(["curd", "hung-curd", "soy-milk"], 150), c(["ghee", "oil"], 5)] },

  { id: "moong-chilla", slots: ["breakfast"], name: "Moong dal chilla with {1}", components: [c(["moong-flour"], 50), c(["paneer", "tofu", "egg"], 60), c(["mixed-veg"], 60, false), c(["oil", "ghee"], 5)] },
  { id: "parfait", slots: ["breakfast", "snack"], name: "{0}, oats and {2}", components: [c(["hung-curd", "soy-milk"], 200), c(["oats"], 40), c(["banana", "apple"], 1), c(["chia", "flax", "almonds"], 10)] },
  { id: "paneer-paratha", slots: ["breakfast"], name: "{0} paratha with {2}", components: [c(["paneer", "tofu"], 70), c(["roti"], 2), c(["curd", "hung-curd", "soy-milk"], 150), c(["ghee", "oil"], 5)] },
  { id: "sprouts-bowl", slots: ["breakfast"], name: "Sprouts and {1} bowl", components: [c(["sprouts"], 150), c(["paneer", "tofu", "egg"], 70), c(["salad"], 80, false), c(["bread", "roti"], 1)] },

  // ---- lunch and dinner
  { id: "protein-rice-dal", slots: ["lunch", "dinner"], name: "{0}, rice and dal", components: [c(MAIN_PROTEIN, 120), c(["rice", "brown-rice"], 150), c(["dal", "masoor"], 150), c(["mixed-veg", "palak"], 100, false), c(["ghee", "oil"], 5)] },
  { id: "curry-roti", slots: ["lunch", "dinner"], name: "{0} curry with {1}", components: [c(CURRY_PROTEIN, 130), c(["roti", "jowar-roti"], 2), c(["salad"], 100, false), c(["oil", "ghee"], 5)] },
  { id: "rajma-chawal", slots: ["lunch"], name: "{0} and rice with {2}", components: [c(["rajma", "chana", "lobia"], 175), c(["rice", "brown-rice"], 150), c(["curd", "hung-curd", "tofu"], 100), c(["salad"], 80, false), c(["ghee", "oil"], 5)] },
  { id: "khichdi", slots: ["dinner"], name: "Khichdi with {2}", components: [c(["rice", "dalia"], 120), c(["dal", "masoor"], 175), c(["curd", "hung-curd", "tofu"], 150), c(["mixed-veg"], 80, false), c(["ghee", "oil"], 5)] },
  { id: "power-bowl", slots: ["lunch", "dinner"], name: "{0} bowl with {1}", components: [c(["chicken-breast", "tofu", "tempeh", "chana", "paneer"], 130), c(["quinoa", "sweet-potato", "brown-rice"], 150), c(["broccoli", "mushroom"], 100, false), c(["olive-oil", "oil"], 5)] },
  { id: "palak-roti", slots: ["dinner", "lunch"], name: "Palak {0} with {1}", components: [c(["paneer", "tofu", "chicken-thigh"], 120), c(["roti", "jowar-roti"], 2), c(["palak"], 150, false), c(["dal", "masoor"], 100, true, true), c(["oil", "ghee"], 5)] },

  // ---- snacks
  { id: "sprouts-chaat", slots: ["snack"], name: "Sprouts chaat", components: [c(["sprouts"], 120), c(["roasted-chana"], 20), c(["salad"], 80, false)] },
  { id: "yogurt-bowl", slots: ["snack"], name: "{0} with {1} and {2}", components: [c(["hung-curd", "curd", "soy-milk"], 150), c(["papaya", "apple"], 150, false), c(["almonds", "walnuts", "chia"], 15)] },
  { id: "chana-fruit", slots: ["snack"], name: "{0} and {1}", components: [c(["roasted-chana", "peanuts"], 35), c(["apple", "orange", "guava"], 1, false)] },
  { id: "eggs-fruit", slots: ["snack"], name: "Boiled {0}s and {1}", components: [c(["egg", "egg-white"], 2), c(["orange", "apple", "guava"], 1, false)] },
  { id: "hummus-veg", slots: ["snack"], name: "Hummus with vegetables", components: [c(["hummus"], 80), c(["salad"], 120, false), c(["roasted-chana"], 15, true, true)] },
  { id: "tikka", slots: ["snack", "dinner"], name: "{0} tikka with salad", components: [c(["paneer", "tofu", "chicken-breast", "fish"], 100), c(["salad"], 120, false), c(["hung-curd", "curd"], 50), c(["oil"], 5)] },
  { id: "soya-chaat", slots: ["snack"], name: "Soya chaat", components: [c(["soya-chunks"], 30), c(["salad"], 100, false), c(["roasted-chana", "peanuts"], 15, true, true)] },
  { id: "makhana-curd", slots: ["snack", "pre"], name: "Makhana and {1}", components: [c(["makhana"], 25), c(["curd", "hung-curd", "soy-milk"], 150), c(["dates", "banana"], 2, true, true)] },
  { id: "chaas-peanuts", slots: ["snack"], name: "Chaas and {1}", components: [c(["buttermilk"], 250), c(["peanuts", "roasted-chana"], 25)] },

  // ---- around training
  { id: "banana-chana", slots: ["pre"], name: "{0} and {1}", components: [c(["banana"], 1), c(["roasted-chana", "whey"], 20), c(["dates"], 2, true, true)] },
  { id: "toast-honey", slots: ["pre"], name: "Toast with {1}", components: [c(["bread"], 2), c(["honey", "jaggery"], 10), c(["skim-milk", "soy-milk"], 200, true, true)] },
  { id: "shake", slots: ["post"], name: "{0} shake with {1}", components: [c(["whey"], 30), c(["banana"], 1), c(["skim-milk", "soy-milk"], 250), c(["oats"], 30, true, true)] },
  { id: "milk-banana", slots: ["post"], name: "{0}, {1} and {2}", components: [c(["milk", "soy-milk"], 300), c(["banana"], 1), c(["dates", "roasted-chana"], 3), c(["hung-curd", "tofu"], 100, true, true)] },
  { id: "curd-fruit", slots: ["post"], name: "{0}, {1} and {2}", components: [c(["hung-curd", "curd", "tofu"], 200), c(["banana", "apple"], 1), c(["roasted-chana", "oats"], 30)] },
];
