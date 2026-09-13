"""
Builds the training sets.

Three files, because the problem is three problems:

  diet_katch.csv   body fat known   -> Katch-McArdle, height and age irrelevant
  diet_mifflin.csv body fat unknown -> Mifflin-St Jeor, height and age required
  session.csv      training plan    -> small enough to enumerate completely

Bodies are enumerated, not sampled: the space is bounded, so coverage can be
proven rather than hoped for. Conditions are sampled on top, since crossing
them exhaustively multiplies the grid without adding information.

Run:  ml/.venv/bin/python -m ml.generate
"""
from __future__ import annotations

import csv
import itertools
import random
from pathlib import Path

from .rules import (
    CONDITION_MODIFIERS, MUSCLES, REFUSE, as_row, refuse_reason, session, targets,
)

OUT = Path(__file__).parent / "data"
SEED = 20260913

GOALS = ["cut", "maintain", "bulk"]
SEXES = ["male", "female"]
DAYS = [2, 3, 4, 5, 6]
EXPERIENCE = ["beginner", "intermediate", "advanced"]
EQUIPMENT = ["none", "dumbbell", "gym", "full"]
INJURIES = ["knee", "shoulder", "lower_back", "elbow"]

# Survivable body fat floors. Below these nobody is walking around.
BF_MIN = {"male": 4.0, "female": 10.0}
BF_MAX = {"male": 60.0, "female": 65.0}
WEIGHT_MIN, WEIGHT_MAX = 35.0, 200.0


def write(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    keys = list(rows[0].keys())
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        w.writerows(rows)
    print(f"{path.name:20} {len(rows):>8,} rows  {len(keys):>3} cols")


def diet_katch() -> list[dict]:
    """Body fat known. The plan depends on lean mass and body fat, not height."""
    rows = []
    for sex, lean, bf, days, goal in itertools.product(
        SEXES, range(25, 91), range(4, 66), DAYS, GOALS
    ):
        bf = float(bf)
        if not (BF_MIN[sex] <= bf <= BF_MAX[sex]):
            continue
        weight = lean / (1.0 - bf / 100.0)
        if not (WEIGHT_MIN <= weight <= WEIGHT_MAX):
            continue
        t = targets(
            weight_kg=weight, height_cm=170.0, age=30, sex=sex,
            bodyfat_pct=bf, days=days, goal=goal,
        )
        rows.append({
            "sex": sex, "lean_kg": round(lean, 1), "bodyfat_pct": bf,
            "weight_kg": round(weight, 2), "days": days, "goal": goal,
            "condition": "", **{k: v for k, v in t.__dict__.items()},
        })
    return rows


def diet_mifflin() -> list[dict]:
    """Body fat blank. Height and age carry the estimate instead."""
    rows = []
    for sex, height, weight, age, days, goal in itertools.product(
        SEXES, range(145, 201, 5), range(40, 161, 5), range(18, 66, 4), DAYS, GOALS
    ):
        bmi = weight / (height / 100.0) ** 2
        if not (13.0 <= bmi <= 55.0):
            continue
        t = targets(
            weight_kg=float(weight), height_cm=float(height), age=age, sex=sex,
            bodyfat_pct=None, days=days, goal=goal,
        )
        rows.append({
            "sex": sex, "height_cm": height, "weight_kg": weight, "age": age,
            "bmi": round(bmi, 2), "days": days, "goal": goal,
            "condition": "", **{k: v for k, v in t.__dict__.items()},
        })
    return rows


def diet_conditions(base: list[dict], per_condition: int) -> list[dict]:
    """
    Conditions that move the numbers, sampled over the same bodies. Crossing
    them exhaustively would multiply the grid sixteenfold to say very little.
    """
    rng = random.Random(SEED)
    names = sorted(CONDITION_MODIFIERS)
    combos = [frozenset([n]) for n in names]
    combos += [frozenset(p) for p in itertools.combinations(names, 2)]

    rows = []
    for combo in combos:
        # Sex-specific conditions only attach to the sex that has them.
        pool = [r for r in base if not ({"pcos"} & combo) or r["sex"] == "female"]
        for src in rng.sample(pool, min(per_condition, len(pool))):
            t = targets(
                weight_kg=src["weight_kg"], height_cm=170.0, age=30, sex=src["sex"],
                bodyfat_pct=src["bodyfat_pct"], days=src["days"], goal=src["goal"],
                conditions=combo,
            )
            rows.append({**src, "condition": "+".join(sorted(combo)), **t.__dict__})
    return rows


def sessions() -> list[dict]:
    """The whole training space, enumerated. It is small."""
    rows = []
    for days, exp, equip, goal in itertools.product(DAYS, EXPERIENCE, EQUIPMENT, GOALS):
        for r in range(len(INJURIES) + 1):
            for inj in itertools.combinations(INJURIES, r):
                s = session(days=days, experience=exp, goal=goal,
                            equipment=equip, injuries=frozenset(inj))
                rows.append({
                    "days": days, "experience": exp, "equipment": equip, "goal": goal,
                    **{f"injury_{i}": int(i in inj) for i in INJURIES},
                    "split": s.split, "sets_per_session": s.sets_per_session,
                    "rep_low": s.rep_low, "rep_high": s.rep_high,
                    "cardio_sessions": s.cardio_sessions,
                    **{f"sets_{m}": s.weekly_sets[m] for m in MUSCLES},
                })
    return rows


def refusals() -> list[dict]:
    """
    Profiles that must never receive a generated plan. Kept as their own file so
    the boundary is testable, and deliberately excluded from training: a model
    that learns to predict for these has learned the wrong lesson.
    """
    rows = []
    for cond in sorted(REFUSE):
        for sex, age in itertools.product(SEXES, [16, 17, 25, 40, 60]):
            rows.append({
                "sex": sex, "age": age, "condition": cond,
                "refused": refuse_reason({cond}, age) or "",
            })
    for sex in SEXES:
        for age in [12, 15, 17]:
            rows.append({"sex": sex, "age": age, "condition": "",
                         "refused": refuse_reason(set(), age) or ""})
    return rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    katch = diet_katch()
    mifflin = diet_mifflin()
    cond = diet_conditions(katch, per_condition=4000)

    write(OUT / "diet_katch.csv", katch + cond)
    write(OUT / "diet_mifflin.csv", mifflin)
    write(OUT / "session.csv", sessions())
    write(OUT / "refusals.csv", refusals())

    total = len(katch) + len(cond) + len(mifflin) + len(sessions())
    print(f"\n{'TOTAL TRAINING ROWS':20} {total:>8,}")
    print(f"{'refusal rows':20} {len(refusals()):>8,}  (never trained on)")


if __name__ == "__main__":
    main()
