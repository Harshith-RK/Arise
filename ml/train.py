"""
Trains the plan models and measures how well they reproduce the rules.

Three evaluations, because only the last two say anything useful:

  random holdout   every test row sits between two training rows. Flattering.
  region holdout   trained without heavy bodies, tested on them. Extrapolation.
  learning curve   where the error stops falling, and how low it gets.

Errors are reported in kcal and grams. R-squared on a deterministic function is
always near 1 and tells you nothing.

Run:  ml/.venv/bin/python -m ml.train
"""
from __future__ import annotations

import pickle
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.preprocessing import OrdinalEncoder

DATA = Path(__file__).parent / "data"
MODELS = Path(__file__).parent / "models"
RNG = 20260913

DIET_TARGETS = ["kcal", "protein_g", "carbs_g", "fat_g"]
UNITS = {"kcal": "kcal", "protein_g": "g", "carbs_g": "g", "fat_g": "g"}


def encode(df: pd.DataFrame, cats: list[str]) -> tuple[np.ndarray, list[int]]:
    out = df.copy()
    for c in cats:
        out[c] = out[c].fillna("").astype(str)
    enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    out[cats] = enc.fit_transform(out[cats])
    return out.to_numpy(dtype=float), [out.columns.get_loc(c) for c in cats]


def fit(X, y, cat_idx, seed=RNG, iters=400):
    m = HistGradientBoostingRegressor(
        max_iter=iters, learning_rate=0.1, max_depth=None,
        categorical_features=cat_idx, random_state=seed,
    )
    m.fit(X, y)
    return m


def report(name: str, y_true, y_pred, unit: str) -> float:
    err = np.abs(y_true - y_pred)
    mae, p95, worst = err.mean(), np.percentile(err, 95), err.max()
    print(f"    {name:<14} MAE {mae:7.2f} {unit:<5} p95 {p95:7.2f}  worst {worst:8.2f}")
    return mae


def diet_model(path: Path, features: list[str], cats: list[str], label: str,
               region_col: str, region_cut: float) -> dict:
    print(f"\n{'=' * 72}\n{label}  ({path.name})\n{'=' * 72}")
    df = pd.read_csv(path)
    print(f"  rows {len(df):,}   features {features}")

    X, cat_idx = encode(df[features], cats)
    results = {}

    # ---- random holdout
    rng = np.random.default_rng(RNG)
    mask = rng.random(len(df)) < 0.8
    print("\n  RANDOM HOLDOUT (80/20)")
    for t in DIET_TARGETS:
        y = df[t].to_numpy()
        m = fit(X[mask], y[mask], cat_idx)
        results[f"random_{t}"] = report(t, y[~mask], m.predict(X[~mask]), UNITS[t])

    # ---- region holdout: never saw a heavy body
    tr = df[region_col] < region_cut
    print(f"\n  REGION HOLDOUT (trained on {region_col} < {region_cut}, "
          f"tested on >= {region_cut}: {(~tr).sum():,} rows)")
    for t in DIET_TARGETS:
        y = df[t].to_numpy()
        m = fit(X[tr.to_numpy()], y[tr.to_numpy()], cat_idx)
        results[f"region_{t}"] = report(t, y[~tr.to_numpy()], m.predict(X[~tr.to_numpy()]), UNITS[t])

    # ---- learning curve on kcal
    print("\n  LEARNING CURVE (kcal, random holdout)")
    y = df["kcal"].to_numpy()
    Xtr, ytr, Xte, yte = X[mask], y[mask], X[~mask], y[~mask]
    curve = {}
    for n in [1_000, 5_000, 20_000, 50_000, 100_000, len(Xtr)]:
        if n > len(Xtr):
            continue
        idx = np.random.default_rng(RNG).choice(len(Xtr), n, replace=False)
        t0 = time.time()
        m = fit(Xtr[idx], ytr[idx], cat_idx)
        mae = mean_absolute_error(yte, m.predict(Xte))
        curve[n] = mae
        print(f"    n={n:>7,}   MAE {mae:7.2f} kcal   ({time.time() - t0:.1f}s)")
    results["curve"] = curve

    # ---- ship-size model on the full set
    MODELS.mkdir(exist_ok=True)
    sizes = {}
    for t in DIET_TARGETS:
        m = fit(X, df[t].to_numpy(), cat_idx)
        p = MODELS / f"{path.stem}_{t}.pkl"
        p.write_bytes(pickle.dumps(m))
        sizes[t] = p.stat().st_size
    total = sum(sizes.values())
    print(f"\n  MODEL SIZE  {total / 1e6:.2f} MB for {len(DIET_TARGETS)} targets "
          f"({total / len(DIET_TARGETS) / 1e6:.2f} MB each)")
    results["bytes"] = total
    return results


def session_model() -> dict:
    print(f"\n{'=' * 72}\nTRAINING SESSION  (session.csv)\n{'=' * 72}")
    df = pd.read_csv(DATA / "session.csv")
    feats = ["days", "experience", "equipment", "goal",
             "injury_knee", "injury_shoulder", "injury_lower_back", "injury_elbow"]
    cats = ["experience", "equipment", "goal"]
    X, cat_idx = encode(df[feats], cats)
    print(f"  rows {len(df):,}  (the entire space, enumerated)")

    rng = np.random.default_rng(RNG)
    mask = rng.random(len(df)) < 0.8

    clf = HistGradientBoostingClassifier(
        max_iter=200, categorical_features=cat_idx, random_state=RNG)
    clf.fit(X[mask], df["split"][mask])
    acc = accuracy_score(df["split"][~mask], clf.predict(X[~mask]))
    print(f"\n  split classification   accuracy {acc:.4f}")

    print("\n  weekly volume regression")
    muscles = [c for c in df.columns if c.startswith("sets_") and c != "sets_per_session"]
    maes = []
    for t in muscles:
        y = df[t].to_numpy(dtype=float)
        m = fit(X[mask], y[mask], cat_idx, iters=200)
        maes.append(report(t.replace("sets_", ""), y[~mask], m.predict(X[~mask]), "sets"))
    print(f"    mean across muscles: {np.mean(maes):.3f} sets")
    return {"split_accuracy": acc, "volume_mae": float(np.mean(maes))}


def main() -> None:
    katch = diet_model(
        DATA / "diet_katch.csv",
        ["sex", "lean_kg", "bodyfat_pct", "weight_kg", "days", "goal", "condition"],
        ["sex", "goal", "condition"],
        "DIET, BODY FAT KNOWN", "lean_kg", 75.0,
    )
    mifflin = diet_model(
        DATA / "diet_mifflin.csv",
        ["sex", "height_cm", "weight_kg", "age", "days", "goal"],
        ["sex", "goal"],
        "DIET, BODY FAT UNKNOWN", "weight_kg", 120.0,
    )
    sess = session_model()

    print(f"\n{'=' * 72}\nSUMMARY\n{'=' * 72}")
    print(f"  kcal MAE, random holdout   {katch['random_kcal']:.1f} kcal (katch) / "
          f"{mifflin['random_kcal']:.1f} kcal (mifflin)")
    print(f"  kcal MAE, region holdout   {katch['region_kcal']:.1f} kcal (katch) / "
          f"{mifflin['region_kcal']:.1f} kcal (mifflin)")
    print(f"  split accuracy             {sess['split_accuracy']:.4f}")
    print(f"  volume MAE                 {sess['volume_mae']:.3f} sets")
    print(f"  model size, diet only      {(katch['bytes'] + mifflin['bytes']) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
