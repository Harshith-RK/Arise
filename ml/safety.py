"""
Does the trained model ever recommend something unsafe?

The rules enforce hard clamps: never below resting metabolic rate, never below
an absolute floor, never faster than 1% of bodyweight per week. A formula
cannot break them because they are written as code. A model has only ever seen
their consequences, so it can land anywhere near them.

This counts how often it does.

Run:  ml/.venv/bin/python -m ml.safety
"""
from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd

from .rules import KCAL_FLOOR, KCAL_PER_KG_FAT, MAX_WEEKLY_LOSS_FRACTION
from .train import DIET_TARGETS, encode

DATA = Path(__file__).parent / "data"
MODELS = Path(__file__).parent / "models"


def check(stem: str, features: list[str], cats: list[str], label: str) -> None:
    print(f"\n{'=' * 72}\n{label}\n{'=' * 72}")
    df = pd.read_csv(DATA / f"{stem}.csv", low_memory=False)
    X, _ = encode(df[features], cats)

    pred = {}
    for t in DIET_TARGETS:
        model = pickle.loads((MODELS / f"{stem}_{t}.pkl").read_bytes())
        pred[t] = model.predict(X)

    kcal = pred["kcal"]
    bmr = df["bmr"].to_numpy()
    weight = df["weight_kg"].to_numpy()
    floor = np.where(df["sex"].to_numpy() == "male", KCAL_FLOOR["male"], KCAL_FLOOR["female"])
    cutting = (df["goal"] == "cut").to_numpy()

    below_bmr = cutting & (kcal < bmr - 1)
    below_floor = cutting & (kcal < floor - 1)
    rate = (df["tdee"].to_numpy() - kcal) * 7.0 / KCAL_PER_KG_FAT
    too_fast = cutting & (rate > weight * MAX_WEEKLY_LOSS_FRACTION + 0.01)

    # Macros that do not add up to the calories they came with.
    macro_kcal = pred["protein_g"] * 4 + pred["carbs_g"] * 4 + pred["fat_g"] * 9
    drift = np.abs(macro_kcal - kcal)

    n = len(df)
    print(f"  rows checked                {n:>9,}")
    print(f"  predicted below BMR         {below_bmr.sum():>9,}  ({below_bmr.mean() * 100:5.2f}%)")
    print(f"  predicted below hard floor  {below_floor.sum():>9,}  ({below_floor.mean() * 100:5.2f}%)")
    print(f"  loss rate over 1%/week      {too_fast.sum():>9,}  ({too_fast.mean() * 100:5.2f}%)")
    print(f"  macros disagree with kcal   mean {drift.mean():6.1f} kcal, worst {drift.max():7.1f} kcal")

    if below_bmr.any():
        worst = int(np.argmin(np.where(below_bmr, kcal - bmr, np.inf)))
        r = df.iloc[worst]
        print(f"\n  worst case: {r['sex']}, {r['weight_kg']:.0f} kg, goal {r['goal']}")
        print(f"    rules say {r['kcal']:.0f} kcal (BMR {r['bmr']:.0f})")
        print(f"    model says {kcal[worst]:.0f} kcal  -> {bmr[worst] - kcal[worst]:.0f} below BMR")


def main() -> None:
    check("diet_katch",
          ["sex", "lean_kg", "bodyfat_pct", "weight_kg", "days", "goal", "condition"],
          ["sex", "goal", "condition"], "SAFETY: BODY FAT KNOWN")
    check("diet_mifflin",
          ["sex", "height_cm", "weight_kg", "age", "days", "goal"],
          ["sex", "goal"], "SAFETY: BODY FAT UNKNOWN")
    print("\n  Note: these are in-distribution rows the model was trained on.")
    print("  Anything outside the sampled ranges is worse, see REGION HOLDOUT.")


if __name__ == "__main__":
    main()
