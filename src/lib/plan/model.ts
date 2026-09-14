/* ==========================================================================
   Plan model runtime.

   The trained gradient-boosted trees, walked in plain TypeScript. No inference
   runtime: the model file is arrays of splits and leaf values, and prediction
   is following them. ml/export.py writes the file and checks it against
   scikit-learn; parity.json checks this walker against ml/export.py.
   ========================================================================== */

/** One tree. `f[i] === -1` marks a leaf holding `v[i]`. */
type Tree = { f: number[]; t: number[]; l: number[]; r: number[]; v: number[] };
export type Regressor = { base: number; trees: Tree[] };
export type Classifier = { classes: string[]; base: number[]; trees: Tree[][] };

export type PlanModel = {
  version: number;
  features: { katch: string[]; mifflin: string[]; session: string[] };
  encodings: {
    goal: Record<string, number>;
    experience: Record<string, number>;
    equipment: Record<string, number>;
    flags: string[];
    injuries: string[];
    muscles: string[];
  };
  ranges: {
    katch: { lean_kg: [number, number]; weight_kg: [number, number]; days: [number, number]; bodyfat_pct: Record<string, [number, number]> };
    mifflin: { height_cm: [number, number]; weight_kg: [number, number]; age: [number, number]; days: [number, number]; bmi: [number, number] };
  };
  katch: Record<"kcal" | "protein_g" | "fat_g", Regressor>;
  mifflin: Record<"kcal" | "protein_g" | "fat_g", Regressor>;
  session: { split: Classifier; volume: Record<string, Regressor> };
};

function walk(tree: Tree, x: readonly number[]): number {
  let i = 0;
  while (tree.f[i] !== -1) i = x[tree.f[i]] <= tree.t[i] ? tree.l[i] : tree.r[i];
  return tree.v[i];
}

/** Summed in the same order as ml/export.py, so results match to the bit. */
function sumTrees(trees: Tree[], x: readonly number[]): number {
  let s = 0;
  for (const t of trees) s += walk(t, x);
  return s;
}

export function runRegressor(m: Regressor, x: readonly number[]): number {
  return m.base + sumTrees(m.trees, x);
}

export function runClassifier(m: Classifier, x: readonly number[]): string {
  let best = 0;
  let bestScore = -Infinity;
  m.trees.forEach((trees, k) => {
    const score = m.base[k] + sumTrees(trees, x);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  });
  return m.classes[best];
}

let cached: Promise<PlanModel> | null = null;

/**
 * Loaded on demand, as its own chunk. About 200 KB over the wire, which is fine
 * on the one screen that needs it and would not be on every screen that does
 * not.
 */
export function loadPlanModel(): Promise<PlanModel> {
  cached ??= import("./model.json").then((m) => (m.default ?? m) as unknown as PlanModel);
  return cached;
}
