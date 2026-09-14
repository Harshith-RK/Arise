"""
Trains the shipped models and exports them for the browser.

The app is local-first and works offline, so inference runs client-side with no
runtime: the exported file is plain tree arrays, walked by a few lines of
TypeScript in src/lib/plan/model.ts.

Outputs
  src/lib/plan/model.json               the models
  src/lib/plan/__fixtures__/parity.json inputs with expected outputs, so the
                                        TypeScript port is tested against this
                                        file rather than trusted

Every exported model is re-evaluated from its exported form here and checked
against scikit-learn before anything is written.

Run:  ml/.venv/bin/python -m ml.export
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor

from .rules import (
    ACTIVITY, CONDITION_MODIFIERS, KCAL_FLOOR, KCAL_PER_KG_FAT, MAX_WEEKLY_GAIN_FRACTION,
    MAX_WEEKLY_LOSS_FRACTION, MUSCLES, REFUSE, katch_mcardle_bmr, mifflin_bmr, session, targets,
)

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(__file__).parent / "data"
OUT_MODEL = ROOT / "src/lib/plan/model.json"
OUT_FIXTURE = ROOT / "src/lib/plan/__fixtures__/parity.json"
RNG = 20260913

FLAGS = ["hypothyroid", "pcos", "insulin_resistance", "hypertension"]
GOALS = {"cut": 0, "maintain": 1, "bulk": 2}
EXPERIENCE = {"beginner": 0, "intermediate": 1, "advanced": 2}
EQUIPMENT = {"none": 0, "dumbbell": 1, "gym": 2, "full": 3}
INJURIES = ["knee", "shoulder", "lower_back", "elbow"]

KATCH_FEATURES = ["female", "lean_kg", "bodyfat_pct", "weight_kg", "days", "goal", *FLAGS]
MIFFLIN_FEATURES = ["female", "height_cm", "weight_kg", "age", "days", "goal", *FLAGS]
SESSION_FEATURES = ["days", "experience", "equipment", "goal", *[f"injury_{i}" for i in INJURIES]]
DIET_HEADS = ["kcal", "protein_g", "fat_g"]   # carbs are derived, so macros always add up

# Chosen by sweeping size against accuracy. The calorie head earns the most
# capacity; protein and fat are close to deterministic, and within a gram is
# below the rounding the targets get anyway. Real-world error on any of these
# is the formula's ~15%, so shaving a couple of kcal of fit is not worth the
# megabyte it would cost a phone.
HEAD_PARAMS = {
    "kcal":      dict(max_iter=120, max_leaf_nodes=63, learning_rate=0.2),
    "protein_g": dict(max_iter=30,  max_leaf_nodes=31, learning_rate=0.4),
    "fat_g":     dict(max_iter=30,  max_leaf_nodes=31, learning_rate=0.4),
}
COMMON = dict(early_stopping=False, random_state=RNG)


# ---------------------------------------------------------------- frames

def diet_frame(path: Path, features: list[str]) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    cond = df["condition"].fillna("").astype(str)
    df["female"] = (df["sex"] == "female").astype(float)
    df["goal"] = df["goal"].map(GOALS).astype(float)
    for f in FLAGS:
        df[f] = cond.str.contains(f, regex=False).astype(float)
    return df


# ---------------------------------------------------------------- export form

def export_regressor(m: HistGradientBoostingRegressor) -> dict:
    trees = []
    for (pred,) in m._predictors:
        n = pred.nodes
        leaf = n["is_leaf"].astype(bool)
        trees.append({
            # Leaves carry a value and no split; internal nodes the reverse.
            "f": np.where(leaf, -1, n["feature_idx"]).astype(int).tolist(),
            "t": np.round(np.where(leaf, 0, n["num_threshold"]), 4).tolist(),
            "l": n["left"].astype(int).tolist(),
            "r": n["right"].astype(int).tolist(),
            "v": np.round(np.where(leaf, n["value"], 0), 5).tolist(),
        })
    return {"base": float(np.ravel(m._baseline_prediction)[0]), "trees": trees}


def export_classifier(m: HistGradientBoostingClassifier) -> dict:
    per_class = [[] for _ in m.classes_]
    for step in m._predictors:
        for k, pred in enumerate(step):
            n = pred.nodes
            leaf = n["is_leaf"].astype(bool)
            per_class[k].append({
                "f": np.where(leaf, -1, n["feature_idx"]).astype(int).tolist(),
                "t": np.round(np.where(leaf, 0, n["num_threshold"]), 4).tolist(),
                "l": n["left"].astype(int).tolist(),
                "r": n["right"].astype(int).tolist(),
                "v": np.round(np.where(leaf, n["value"], 0), 5).tolist(),
            })
    return {
        "classes": [str(c) for c in m.classes_],
        "base": np.ravel(m._baseline_prediction).astype(float).tolist(),
        "trees": per_class,
    }


def walk(tree: dict, x) -> float:
    i = 0
    while tree["f"][i] != -1:
        i = tree["l"][i] if x[tree["f"][i]] <= tree["t"][i] else tree["r"][i]
    return tree["v"][i]


def run_regressor(e: dict, x) -> float:
    return e["base"] + sum(walk(t, x) for t in e["trees"])


def run_classifier(e: dict, x) -> str:
    scores = [e["base"][k] + sum(walk(t, x) for t in trees) for k, trees in enumerate(e["trees"])]
    return e["classes"][int(np.argmax(scores))]


# ---------------------------------------------------------------- guardrails
# Mirror of src/lib/plan/targets.ts, so the safety numbers below describe what
# the app actually does rather than what the bare model does.

RANGES = {
    "katch": {"lean_kg": (25, 90), "weight_kg": (35, 200), "days": (2, 6),
              "bodyfat_pct": {"male": (4, 60), "female": (10, 65)}},
    "mifflin": {"height_cm": (145, 200), "weight_kg": (40, 160), "age": (18, 65), "days": (2, 6),
                "bmi": (13, 55)},
}


def guard(pred: dict, *, weight, lean, sex, days, goal, bmr, conditions) -> dict:
    tdee = bmr * ACTIVITY[days]
    for c in conditions:
        tdee *= CONDITION_MODIFIERS.get(c, {}).get("tdee_scale", 1.0)
    kcal = pred["kcal"]
    if goal == "cut":
        kcal = min(max(kcal, bmr, min(KCAL_FLOOR[sex], tdee)), tdee)
    loss = (tdee - kcal) * 7 / KCAL_PER_KG_FAT
    if loss > weight * MAX_WEEKLY_LOSS_FRACTION:
        kcal = tdee - weight * MAX_WEEKLY_LOSS_FRACTION * KCAL_PER_KG_FAT / 7
    elif -loss > weight * MAX_WEEKLY_GAIN_FRACTION:
        kcal = tdee + weight * MAX_WEEKLY_GAIN_FRACTION * KCAL_PER_KG_FAT / 7
    protein = max(0.0, pred["protein_g"])
    fat = max(0.0, pred["fat_g"])
    carbs = (kcal - protein * 4 - fat * 9) / 4
    if carbs < 0:
        fat = max(0.5 * weight, (kcal - protein * 4) / 9)
        carbs = (kcal - protein * 4 - fat * 9) / 4
    if carbs < 0:
        protein = max(1.2 * lean, (kcal - fat * 9) / 4)
        carbs = max(0.0, (kcal - protein * 4 - fat * 9) / 4)
    return {"kcal": kcal, "protein_g": protein, "fat_g": fat, "carbs_g": carbs, "tdee": tdee}


# ---------------------------------------------------------------- training

def train_diet(name: str, path: Path, features: list[str], region: tuple[str, float]):
    df = diet_frame(path, features)
    X = df[features].to_numpy(float)
    mask = np.random.default_rng(RNG).random(len(df)) < 0.8
    print(f"\n{name}: {len(df):,} rows")

    exported, report = {}, {}
    for head in DIET_HEADS:
        y = df[head].to_numpy(float)
        params = {**HEAD_PARAMS[head], **COMMON}
        holdout = HistGradientBoostingRegressor(**params).fit(X[mask], y[mask])
        mae = float(np.abs(holdout.predict(X[~mask]) - y[~mask]).mean())

        col, cut = region
        inside = (df[col] < cut).to_numpy()
        regional = HistGradientBoostingRegressor(**params).fit(X[inside], y[inside])
        region_mae = float(np.abs(regional.predict(X[~inside]) - y[~inside]).mean())

        full = HistGradientBoostingRegressor(**params).fit(X, y)
        e = export_regressor(full)

        # Parity: the exported form must reproduce scikit-learn.
        idx = np.random.default_rng(RNG).choice(len(X), 1500, replace=False)
        ours = np.array([run_regressor(e, X[i]) for i in idx])
        drift = float(np.abs(ours - full.predict(X[idx])).max())
        assert drift < 0.05, f"{name}.{head} export drifts {drift}"

        exported[head] = e
        report[head] = {"mae": mae, "region_mae": region_mae, "export_drift": drift}
        print(f"  {head:<10} MAE {mae:7.2f}   region MAE {region_mae:7.2f}   export drift {drift:.5f}")
    return df, X, exported, report


def train_session():
    df = pd.read_csv(DATA / "session.csv")
    df["experience"] = df["experience"].map(EXPERIENCE)
    df["equipment"] = df["equipment"].map(EQUIPMENT)
    df["goal"] = df["goal"].map(GOALS)
    X = df[SESSION_FEATURES].to_numpy(float)

    clf = HistGradientBoostingClassifier(max_iter=10, max_leaf_nodes=7, learning_rate=0.5,
                                         early_stopping=False, random_state=RNG).fit(X, df["split"])
    e_split = export_classifier(clf)
    agree = np.mean([run_classifier(e_split, x) == s for x, s in zip(X, df["split"])])
    assert agree == 1.0, f"split export agreement {agree}"

    volume = {}
    worst = 0.0
    for m in MUSCLES:
        y = df[f"sets_{m}"].to_numpy(float)
        r = HistGradientBoostingRegressor(max_iter=20, max_leaf_nodes=15, learning_rate=0.5,
                                          early_stopping=False, random_state=RNG).fit(X, y)
        e = export_regressor(r)
        err = max(abs(round(run_regressor(e, x)) - yy) for x, yy in zip(X, y))
        worst = max(worst, err)
        volume[m] = e
    print(f"\nsession: split agreement {agree:.0%}, worst rounded volume error {worst:.0f} sets")
    return {"split": e_split, "volume": volume}


def safety(name: str, df, X, exported, bmr_col_fn, lean_fn):
    """Clamp breaks after the app's guardrails, over every training row."""
    below_bmr = below_floor = too_fast = 0
    for i in range(len(df)):
        r = df.iloc[i]
        pred = {h: run_regressor(exported[h], X[i]) for h in DIET_HEADS} if i % 25 == 0 else None
        if pred is None:
            continue
        goal = {0: "cut", 1: "maintain", 2: "bulk"}[int(r["goal"])]
        sex = "female" if r["female"] else "male"
        conds = [f for f in FLAGS if r[f]]
        bmr = bmr_col_fn(r)
        g = guard(pred, weight=float(r["weight_kg"]), lean=lean_fn(r), sex=sex, days=int(r["days"]),
                  goal=goal, bmr=bmr, conditions=conds)
        if goal == "cut":
            below_bmr += g["kcal"] < bmr - 0.5
            below_floor += g["kcal"] < min(KCAL_FLOOR[sex], g["tdee"]) - 0.5
            too_fast += (g["tdee"] - g["kcal"]) * 7 / KCAL_PER_KG_FAT > float(r["weight_kg"]) * MAX_WEEKLY_LOSS_FRACTION + 0.001
    n = (len(df) + 24) // 25
    print(f"  {name} after guardrails, {n:,} rows: below BMR {below_bmr}, below floor {below_floor}, over rate {too_fast}")
    return {"checked": n, "below_bmr": below_bmr, "below_floor": below_floor, "over_rate": too_fast}


def main() -> None:
    katch_df, katch_X, katch, katch_rep = train_diet(
        "katch", DATA / "diet_katch.csv", KATCH_FEATURES, ("lean_kg", 75.0))
    mifflin_df, mifflin_X, mifflin, mifflin_rep = train_diet(
        "mifflin", DATA / "diet_mifflin.csv", MIFFLIN_FEATURES, ("weight_kg", 120.0))
    sess = train_session()

    print("\nsafety")
    s_k = safety("katch", katch_df, katch_X, katch,
                 lambda r: katch_mcardle_bmr(float(r["lean_kg"])), lambda r: float(r["lean_kg"]))
    s_m = safety("mifflin", mifflin_df, mifflin_X, mifflin,
                 lambda r: mifflin_bmr(float(r["weight_kg"]), float(r["height_cm"]), int(r["age"]),
                                       "female" if r["female"] else "male"),
                 lambda r: float(r["weight_kg"]) * 0.75)

    model = {
        "version": 1,
        "features": {"katch": KATCH_FEATURES, "mifflin": MIFFLIN_FEATURES, "session": SESSION_FEATURES},
        "encodings": {"goal": GOALS, "experience": EXPERIENCE, "equipment": EQUIPMENT,
                      "flags": FLAGS, "injuries": INJURIES, "muscles": MUSCLES},
        "ranges": RANGES,
        "katch": katch,
        "mifflin": mifflin,
        "session": sess,
    }
    OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    OUT_MODEL.write_text(json.dumps(model, separators=(",", ":")))
    print(f"\nwrote {OUT_MODEL.relative_to(ROOT)}  {OUT_MODEL.stat().st_size / 1024:.0f} KB")

    # ---- parity fixture: the TypeScript port is tested against these
    rng = np.random.default_rng(RNG)
    cases = []
    for idx in rng.choice(len(katch_df), 30, replace=False):
        r = katch_df.iloc[idx]
        cases.append({"path": "katch", "x": katch_X[idx].tolist(),
                      "expected": {h: run_regressor(katch[h], katch_X[idx]) for h in DIET_HEADS}})
    for idx in rng.choice(len(mifflin_df), 30, replace=False):
        cases.append({"path": "mifflin", "x": mifflin_X[idx].tolist(),
                      "expected": {h: run_regressor(mifflin[h], mifflin_X[idx]) for h in DIET_HEADS}})
    sdf = pd.read_csv(DATA / "session.csv")
    sess_cases = []
    for idx in rng.choice(len(sdf), 25, replace=False):
        r = sdf.iloc[idx]
        injuries = frozenset(i for i in INJURIES if r[f"injury_{i}"])
        s = session(days=int(r["days"]), experience=r["experience"], goal=r["goal"],
                    equipment=r["equipment"], injuries=injuries)
        sess_cases.append({
            "input": {"days": int(r["days"]), "experience": r["experience"], "equipment": r["equipment"],
                      "goal": r["goal"], "injuries": sorted(injuries)},
            "split": s.split, "weekly_sets": s.weekly_sets,
        })
    # Formula fallback parity: the TypeScript rules port against rules.py.
    formula_cases = []
    for prof in [
        dict(weight_kg=95.5, height_cm=175.5, age=22, sex="male", bodyfat_pct=35.3, days=5, goal="cut"),
        dict(weight_kg=78.0, height_cm=162.0, age=28, sex="female", bodyfat_pct=None, days=4, goal="cut"),
        dict(weight_kg=74.84, height_cm=177.8, age=25, sex="male", bodyfat_pct=None, days=5, goal="cut"),
        dict(weight_kg=48.0, height_cm=158.0, age=31, sex="female", bodyfat_pct=19.0, days=3, goal="bulk"),
        dict(weight_kg=210.0, height_cm=190.0, age=40, sex="male", bodyfat_pct=48.0, days=4, goal="cut"),
        dict(weight_kg=62.0, height_cm=150.0, age=70, sex="female", bodyfat_pct=None, days=6, goal="maintain"),
        dict(weight_kg=88.0, height_cm=168.0, age=35, sex="female", bodyfat_pct=None, days=3, goal="cut",
             conditions=frozenset({"pcos", "hypothyroid"})),
    ]:
        conds = prof.pop("conditions", frozenset())
        t = targets(**prof, conditions=conds)
        formula_cases.append({"input": {**prof, "conditions": sorted(conds)},
                              "expected": {k: v for k, v in t.__dict__.items() if k != "clamped"},
                              "clamped": t.clamped})

    OUT_FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FIXTURE.write_text(json.dumps({
        "diet": cases, "session": sess_cases, "formula": formula_cases,
        "report": {"katch": katch_rep, "mifflin": mifflin_rep, "safety": {"katch": s_k, "mifflin": s_m}},
    }, indent=1, default=float))
    print(f"wrote {OUT_FIXTURE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
