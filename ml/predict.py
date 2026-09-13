"""
Run one profile through both the rules and the trained model, side by side.

    ml/.venv/bin/python -m ml.predict --weight 95.5 --bodyfat 35.3 --days 5
    ml/.venv/bin/python -m ml.predict --weight 78 --height 162 --age 28 --sex female --days 4

Nothing here touches the app. It is a bench for comparing the two.
"""
from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

from .rules import targets, session
from .train import DIET_TARGETS, encode

MODELS = Path(__file__).parent / "models"
DATA = Path(__file__).parent / "data"


def model_predict(stem: str, row: dict, features: list[str], cats: list[str]) -> dict:
    """Encode against the full training frame so categories map identically."""
    ref = pd.read_csv(DATA / f"{stem}.csv", low_memory=False, usecols=features)
    frame = pd.concat([ref, pd.DataFrame([row])[features]], ignore_index=True)
    X, _ = encode(frame, cats)
    x = X[-1:]
    out = {}
    for t in DIET_TARGETS:
        model = pickle.loads((MODELS / f"{stem}_{t}.pkl").read_bytes())
        out[t] = float(model.predict(x)[0])
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--weight", type=float, required=True)
    p.add_argument("--height", type=float, default=175.0)
    p.add_argument("--age", type=int, default=30)
    p.add_argument("--sex", choices=["male", "female"], default="male")
    p.add_argument("--bodyfat", type=float, default=None)
    p.add_argument("--days", type=int, default=5)
    p.add_argument("--goal", choices=["cut", "maintain", "bulk"], default="cut")
    p.add_argument("--experience", default="intermediate")
    p.add_argument("--equipment", default="full")
    a = p.parse_args()

    t = targets(weight_kg=a.weight, height_cm=a.height, age=a.age, sex=a.sex,
                bodyfat_pct=a.bodyfat, days=a.days, goal=a.goal)
    s = session(days=a.days, experience=a.experience, goal=a.goal, equipment=a.equipment)

    if a.bodyfat is not None:
        stem = "diet_katch"
        lean = a.weight * (1 - a.bodyfat / 100)
        row = {"sex": a.sex, "lean_kg": round(lean, 1), "bodyfat_pct": a.bodyfat,
               "weight_kg": a.weight, "days": a.days, "goal": a.goal, "condition": ""}
        feats = ["sex", "lean_kg", "bodyfat_pct", "weight_kg", "days", "goal", "condition"]
        cats = ["sex", "goal", "condition"]
    else:
        stem = "diet_mifflin"
        row = {"sex": a.sex, "height_cm": a.height, "weight_kg": a.weight,
               "age": a.age, "days": a.days, "goal": a.goal}
        feats = ["sex", "height_cm", "weight_kg", "age", "days", "goal"]
        cats = ["sex", "goal"]

    m = model_predict(stem, row, feats, cats)

    print(f"\n  {a.sex}, {a.weight} kg, "
          f"{'BF ' + str(a.bodyfat) + '%' if a.bodyfat else str(a.height) + ' cm, age ' + str(a.age)}, "
          f"{a.days} days, {a.goal}\n")
    print(f"  {'':<12}{'RULES':>10}{'MODEL':>10}{'DIFF':>10}")
    for k, unit in [("kcal", "kcal"), ("protein_g", "g"), ("carbs_g", "g"), ("fat_g", "g")]:
        r = getattr(t, k)
        print(f"  {k:<12}{r:>10.0f}{m[k]:>10.0f}{m[k] - r:>+10.1f}  {unit}")
    print(f"\n  BMR {t.bmr:.0f}   TDEE {t.tdee:.0f}   "
          f"{'deficit' if t.deficit > 0 else 'surplus'} {abs(t.deficit):.0f} kcal/day   "
          f"{abs(t.weekly_kg_change):.2f} kg/week")
    if t.clamped:
        print(f"  clamped: {t.clamped}")
    print(f"\n  split {s.split}   {sum(s.weekly_sets.values())} sets/week   "
          f"{s.sets_per_session}/session   reps {s.rep_low}-{s.rep_high}   "
          f"cardio {s.cardio_sessions}x")
    print("  " + "  ".join(f"{k} {v}" for k, v in s.weekly_sets.items()) + "\n")


if __name__ == "__main__":
    main()
