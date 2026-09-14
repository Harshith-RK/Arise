"""
Winter Arc plan rules.

Every number a plan needs, computed from a profile. This is the teacher: the
dataset generator calls it to produce labels, and the trained model learns to
approximate it. Ported to TypeScript later if the deterministic generator ships.

Sources for the constants are noted inline. Nothing here is fitted; it is all
published formulas and volume landmarks.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Literal, Optional

Sex = Literal["male", "female"]
Goal = Literal["cut", "maintain", "bulk"]
Experience = Literal["beginner", "intermediate", "advanced"]
Equipment = Literal["none", "dumbbell", "gym", "full"]

# ---------------------------------------------------------------- constants

KCAL_PER_KG_FAT = 7700.0

# Activity multiplier by training days per week.
ACTIVITY = {0: 1.20, 1: 1.20, 2: 1.375, 3: 1.375, 4: 1.55, 5: 1.55, 6: 1.725, 7: 1.725}

# Deficit as a fraction of TDEE, chosen by body fat. Fatter bodies tolerate a
# steeper deficit; lean ones lose muscle if pushed.
CUT_BANDS_MALE = [(30.0, 0.25), (20.0, 0.20), (12.0, 0.15), (0.0, 0.10)]
CUT_BANDS_FEMALE = [(38.0, 0.25), (28.0, 0.20), (20.0, 0.15), (0.0, 0.10)]

# Surplus for a bulk: leaner bodies can afford a bigger one.
BULK_BANDS_MALE = [(20.0, 0.05), (15.0, 0.10), (0.0, 0.15)]
BULK_BANDS_FEMALE = [(30.0, 0.05), (25.0, 0.10), (0.0, 0.15)]

KCAL_FLOOR = {"male": 1500.0, "female": 1200.0}
MAX_WEEKLY_LOSS_FRACTION = 0.010   # 1.0% of bodyweight per week
MAX_WEEKLY_GAIN_FRACTION = 0.005   # 0.5% per week

PROTEIN_G_PER_KG_LEAN = {"cut": 2.2, "maintain": 2.0, "bulk": 1.8}
FAT_G_PER_KG_BODY_MIN = 0.8

# Weekly working sets per muscle group. Beginners start at minimum effective
# volume, advanced lifters sit near the top of the adaptive range.
VOLUME = {
    "beginner":     {"chest": 8,  "back": 10, "quads": 8,  "hams": 6,  "glutes": 8,  "delts": 8,  "arms": 6,  "calves": 6},
    "intermediate": {"chest": 12, "back": 14, "quads": 12, "hams": 9,  "glutes": 10, "delts": 12, "arms": 10, "calves": 8},
    "advanced":     {"chest": 16, "back": 18, "quads": 16, "hams": 12, "glutes": 12, "delts": 16, "arms": 14, "calves": 10},
}
MUSCLES = list(VOLUME["beginner"].keys())

# Cutting caps recoverable volume; a surplus lifts it.
VOLUME_GOAL_SCALE = {"cut": 0.85, "maintain": 1.0, "bulk": 1.10}

SPLITS = {2: "full_body_x2", 3: "full_body_x3", 4: "upper_lower_x2", 5: "ppl_upper_lower", 6: "ppl_x2"}

REPS = {"cut": (8, 12), "maintain": (6, 12), "bulk": (6, 10)}

# Conditions that change the numbers rather than only the food library.
CONDITION_MODIFIERS = {
    # Measured metabolic rate runs below prediction when thyroid output is low.
    "hypothyroid":        {"tdee_scale": 0.90},
    # Insulin resistance: same calories, carbs shifted into fat.
    "pcos":               {"carb_fraction_shift": -0.15},
    "insulin_resistance": {"carb_fraction_shift": -0.10},
    # No calorie effect, a sodium ceiling the food selector must respect.
    "hypertension":       {"sodium_mg_max": 1500},
}

# Conditions that must not receive a generated plan at all.
REFUSE = {
    "pregnancy", "breastfeeding", "ckd", "type1_diabetes",
    "eating_disorder_history", "under_18", "cancer_treatment",
}


def refuse_reason(conditions: set[str], age: int) -> Optional[str]:
    """Why this profile gets no plan, or None if it may have one."""
    if age < 18:
        return "under_18"
    for c in sorted(conditions):
        if c in REFUSE:
            return c
    return None


# ---------------------------------------------------------------- body

def katch_mcardle_bmr(lean_kg: float) -> float:
    """Preferred when body fat is known. Height and age do not enter."""
    return 370.0 + 21.6 * lean_kg


def mifflin_bmr(weight_kg: float, height_cm: float, age: int, sex: Sex) -> float:
    """Fallback when body fat is unknown."""
    base = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age
    return base + 5.0 if sex == "male" else base - 161.0


def deurenberg_bodyfat(bmi: float, age: int, sex: Sex) -> float:
    """Rough body fat from BMI, used only to pick a deficit band."""
    return 1.20 * bmi + 0.23 * age - 10.8 * (1 if sex == "male" else 0) - 5.4


def band(value: float, bands: list[tuple[float, float]]) -> float:
    for threshold, frac in bands:
        if value >= threshold:
            return frac
    return bands[-1][1]


# ---------------------------------------------------------------- targets

@dataclass
class Targets:
    bmr: float
    tdee: float
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    deficit: float                 # positive = eating below maintenance
    weekly_kg_change: float
    clamped: str                   # which clamp bit, "" if none


def targets(
    *,
    weight_kg: float,
    height_cm: float,
    age: int,
    sex: Sex,
    bodyfat_pct: Optional[float],
    days: int,
    goal: Goal,
    conditions: frozenset[str] = frozenset(),
) -> Targets:
    """Profile in, daily numbers out. Every clamp is recorded, not silent."""
    if bodyfat_pct is not None:
        lean = weight_kg * (1.0 - bodyfat_pct / 100.0)
        bmr = katch_mcardle_bmr(lean)
        bf = bodyfat_pct
    else:
        bmi = weight_kg / (height_cm / 100.0) ** 2
        bf = max(3.0, min(65.0, deurenberg_bodyfat(bmi, age, sex)))
        lean = weight_kg * (1.0 - bf / 100.0)
        bmr = mifflin_bmr(weight_kg, height_cm, age, sex)

    tdee = bmr * ACTIVITY[days]
    for c in conditions:
        tdee *= CONDITION_MODIFIERS.get(c, {}).get("tdee_scale", 1.0)

    if goal == "cut":
        kcal = tdee * (1.0 - band(bf, CUT_BANDS_MALE if sex == "male" else CUT_BANDS_FEMALE))
    elif goal == "bulk":
        kcal = tdee * (1.0 + band(bf, BULK_BANDS_MALE if sex == "male" else BULK_BANDS_FEMALE))
    else:
        kcal = tdee

    clamped = []

    # Never below resting metabolic rate, never below the absolute floor, and
    # never above maintenance. That last one settles a real conflict: a small
    # body can have a TDEE under the floor, where "raise to the floor" would
    # turn a cut into a surplus that the gain cap then drags back under the
    # floor. A cut eats at most maintenance, so the floor stops at TDEE.
    if goal == "cut":
        if kcal < bmr:
            kcal, _ = bmr, clamped.append("bmr")
        floor = min(KCAL_FLOOR[sex], tdee)
        if kcal < floor:
            kcal, _ = floor, clamped.append("floor")
        if kcal > tdee:
            kcal, _ = tdee, clamped.append("maintenance")

    # Rate cap, both directions.
    delta = tdee - kcal
    weekly_kg = delta * 7.0 / KCAL_PER_KG_FAT
    max_loss = weight_kg * MAX_WEEKLY_LOSS_FRACTION
    max_gain = weight_kg * MAX_WEEKLY_GAIN_FRACTION
    if weekly_kg > max_loss:
        kcal = tdee - max_loss * KCAL_PER_KG_FAT / 7.0
        clamped.append("loss_rate")
    elif -weekly_kg > max_gain:
        kcal = tdee + max_gain * KCAL_PER_KG_FAT / 7.0
        clamped.append("gain_rate")

    delta = tdee - kcal
    weekly_kg = delta * 7.0 / KCAL_PER_KG_FAT

    # Macros, in priority order: protein, then a fat floor, carbs take the rest.
    protein = PROTEIN_G_PER_KG_LEAN[goal] * lean
    fat = FAT_G_PER_KG_BODY_MIN * weight_kg
    carb_kcal = kcal - protein * 4.0 - fat * 9.0

    shift = sum(CONDITION_MODIFIERS.get(c, {}).get("carb_fraction_shift", 0.0) for c in conditions)
    if shift and carb_kcal > 0:
        moved = carb_kcal * -shift
        carb_kcal -= moved
        fat += moved / 9.0

    # If protein and the fat floor overrun the budget, fat gives way first.
    if carb_kcal < 0:
        fat = max(0.5 * weight_kg, (kcal - protein * 4.0) / 9.0)
        carb_kcal = kcal - protein * 4.0 - fat * 9.0
        clamped.append("fat_squeeze")
    if carb_kcal < 0:
        protein = max(1.2 * lean, (kcal - fat * 9.0) / 4.0)
        carb_kcal = max(0.0, kcal - protein * 4.0 - fat * 9.0)
        clamped.append("protein_squeeze")

    return Targets(
        bmr=round(bmr, 1),
        tdee=round(tdee, 1),
        kcal=round(kcal, 1),
        protein_g=round(protein, 1),
        carbs_g=round(carb_kcal / 4.0, 1),
        fat_g=round(fat, 1),
        deficit=round(delta, 1),
        weekly_kg_change=round(weekly_kg, 4),
        clamped="|".join(clamped),
    )


# ---------------------------------------------------------------- training

@dataclass
class Session:
    split: str
    weekly_sets: dict          # muscle -> sets
    sets_per_session: float
    rep_low: int
    rep_high: int
    cardio_sessions: int


def session(*, days: int, experience: Experience, goal: Goal, equipment: Equipment,
            injuries: frozenset[str] = frozenset()) -> Session:
    """Split, weekly volume and rep range. Load is never prescribed."""
    split = SPLITS[days]
    scale = VOLUME_GOAL_SCALE[goal]

    # Bodyweight-only training cannot load the posterior chain the same way.
    equip_scale = 0.75 if equipment == "none" else 0.90 if equipment == "dumbbell" else 1.0

    weekly = {}
    for m, base in VOLUME[experience].items():
        v = base * scale * equip_scale
        # An injured region drops to maintenance volume rather than vanishing.
        if ("knee" in injuries and m in ("quads", "hams", "glutes")) or \
           ("shoulder" in injuries and m in ("chest", "delts")) or \
           ("lower_back" in injuries and m in ("back", "hams", "glutes")) or \
           ("elbow" in injuries and m in ("arms",)):
            v *= 0.5
        weekly[m] = int(round(v))

    total = sum(weekly.values())
    low, high = REPS[goal]
    # Cardio rides with the training days, never on rest days.
    cardio = days

    return Session(
        split=split,
        weekly_sets=weekly,
        sets_per_session=round(total / days, 2),
        rep_low=low,
        rep_high=high,
        cardio_sessions=cardio,
    )


def as_row(t: Targets, s: Session) -> dict:
    row = asdict(t)
    row.update({
        "split": s.split,
        "sets_per_session": s.sets_per_session,
        "rep_low": s.rep_low,
        "rep_high": s.rep_high,
        "cardio_sessions": s.cardio_sessions,
    })
    for m, v in s.weekly_sets.items():
        row[f"sets_{m}"] = v
    return row
