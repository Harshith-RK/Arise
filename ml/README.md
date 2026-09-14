# Plan model bench

A complete, self-contained experiment: generate a plan dataset, train a model on
it, and measure how well the model reproduces the rules that made it.

**Nothing here is wired into the app.** `src/` is untouched. This directory
exists so the decision about whether to ship a model can be made against
measurements instead of opinions.

## Layout

```
rules.py      the formulas: BMR, TDEE, deficit bands, macros, clamps,
              volume landmarks, splits, condition modifiers, refusal list
generate.py   builds the datasets from rules.py
train.py      trains and evaluates: random holdout, region holdout, learning curve
safety.py     counts how often the trained model breaks a hard clamp
predict.py    one profile through rules and model, side by side
REPORT.txt    saved output of train.py
SAFETY.txt    saved output of safety.py
```

## Running it

```bash
python3 -m venv ml/.venv
ml/.venv/bin/pip install numpy pandas scikit-learn

ml/.venv/bin/python -m ml.generate     # ~20 MB of CSV, about a minute
ml/.venv/bin/python -m ml.train        # writes models/, prints REPORT
ml/.venv/bin/python -m ml.safety
ml/.venv/bin/python -m ml.predict --weight 95.5 --bodyfat 35.3 --days 5
```

`data/` and `models/` are gitignored: both regenerate from source in about a
minute, and together they are 31 MB.

## What was generated

| File | Rows | Covers |
|---|---|---|
| `diet_katch.csv` | 146,785 | body fat known: lean mass 25-90 kg x body fat 4-65% x 5 day counts x 3 goals x 2 sexes, plus 40k condition variants |
| `diet_mifflin.csv` | 93,600 | body fat unknown: height 145-200 x weight 40-160 x age 18-65 x days x goals x sexes, filtered to BMI 13-55 |
| `session.csv` | 2,880 | the entire training space, enumerated: days x experience x equipment x goal x 16 injury combinations |
| `refusals.csv` | 76 | profiles that must receive no plan. Deliberately excluded from training |
| **Total trained on** | **243,265** | |

Bodies are enumerated rather than sampled, so coverage is provable. Every adult
body between 35 and 200 kg at 1 kg and 1% resolution is in there.

Conditions are split three ways, as designed:

- **filter** (allergies, intolerances, injuries) narrow the libraries
- **modify** (`hypothyroid`, `pcos`, `insulin_resistance`, `hypertension`) change
  the numbers and are in the dataset
- **refuse** (pregnancy, breastfeeding, CKD, type 1 diabetes, eating disorder
  history, under 18, cancer treatment) get no plan at all

## Results

### The model reproduces the rules almost exactly, in range

| | kcal MAE | protein | carbs | fat |
|---|---|---|---|---|
| body fat known | **5.2 kcal** | 0.00 g | 2.7 g | 0.2 g |
| body fat unknown | **15.2 kcal** | 0.4 g | 3.4 g | 0.00 g |

Split classification is **100%** accurate. Weekly volume regression is **0.001
sets**. Both of those are lookup tables, and the model learns them perfectly.

Learning curve on kcal flattens around 100k rows:

```
n=  1,000   35.9 kcal
n=  5,000   13.3
n= 20,000    7.1
n= 50,000    6.4
n=100,000    5.4
n=117,626    5.4   <- plateau
```

### Out of range it falls apart

Trained without heavy bodies, tested only on them:

| | kcal MAE | p95 | worst |
|---|---|---|---|
| body fat known, lean >= 75 kg | **259 kcal** | 521 | 715 |
| body fat unknown, weight >= 120 kg | **313 kcal** | 655 | 839 |

This is the number that matters. A random 80/20 split puts every test row
between two training rows and reports 5 kcal. Hold out a *region* and the same
model is off by more than the entire daily deficit. Any user outside the
sampled ranges gets an answer of this quality, and nothing in the model
signals that it is guessing.

### It breaks safety clamps

On rows drawn from the training distribution:

| | below BMR | below hard floor | over 1%/week |
|---|---|---|---|
| body fat known | 575 (0.39%) | **3,766 (2.57%)** | 0 |
| body fat unknown | 0 | 508 (0.54%) | 0 |

**About 1 in 40 predictions sits below the absolute calorie floor.** The rules
cannot do this: the clamp is a line of code. The model has only ever seen the
clamp's consequences, so it interpolates straight through it.

The four macro heads are trained independently and do not agree with each other
either: predicted protein, carbs and fat reconstruct a calorie total that
differs from the predicted calories by 11 kcal on average and up to 102.

### Size

| | |
|---|---|
| gradient boosting, 8 diet models | **11.6 MB** |
| plus `onnxruntime-web` to run it in the browser | ~2-3 MB gzipped |
| `rules.py`, the thing it approximates | 9 KB |

## Reading of the results

In distribution the model is a faithful copy of the formula, to within about
5 kcal. That is the ceiling, and it is reached at roughly 100,000 rows.

Against that it costs 11.6 MB plus a wasm runtime, cannot be edited (changing
the deficit band means regenerating and retraining rather than editing a
number), cannot explain itself, breaks a safety floor once every forty
predictions, and degrades by 250-300 kcal for anyone outside the sampled range.

If a model does ship, the clamps have to be enforced in code afterwards
regardless, which means `rules.py` ships too.

## Integration

The model now sets targets in the app. `ml/export.py` retrains compact versions
and writes `src/lib/plan/model.json`; the browser walks the trees in plain
TypeScript, with no inference runtime.

```bash
ml/.venv/bin/python -m ml.generate
ml/.venv/bin/python -m ml.export    # writes model.json + parity fixture
npx vitest run src/lib/plan         # TypeScript must reproduce Python
```

**Shipped size:** 767 KB, 196 KB gzipped, loaded as its own chunk only on the
two screens that calculate (onboarding Confirm and System, Targets). The
earlier 11.6 MB was cut by sweeping tree count against leaf count: the calorie
head keeps 120 trees of 63 leaves; protein and fat need only 30 of 31, since
within a gram is below the whole-number targets they produce.

| | kcal MAE | shipped before |
|---|---|---|
| body fat known | 5.8 kcal | 5.2 |
| body fat unknown | 19.8 kcal | 15.2 |

Real-world error on any of these is the formula's ~15%, so a few kcal of fit
was not worth several megabytes on a phone.

**The cage around it** (`src/lib/plan/targets.ts`), each part answering a
measured failure:

- **Range check.** Out of range the model was off by 259 to 313 kcal with no
  signal. A profile outside the trained ranges gets the formula instead, and
  the screen says which one was used and why.
- **Clamps in code.** The bare model put 2.57% of predictions under the
  calorie floor. After the clamps: zero, over every training row in Python and
  a 1,000+ body sweep in the TypeScript tests.
- **Carbs derived.** The independent heads disagreed with each other by up to
  102 kcal. Carbs are now calories minus protein and fat, so macros always add up.
- **Refusals before the model runs.** Under 18, pregnancy, breastfeeding, kidney
  disease, type 1 diabetes, eating disorder history and cancer treatment get no
  targets, a plain reason, and a field for their clinician's numbers.

**Parity.** `model.json` is checked against scikit-learn at export (worst drift
0.00013 kcal), and the TypeScript walker is checked against the exported form on
60 cases to six decimal places. The formula port matches `rules.py` on 7 profiles
and the training split on 25.

One rule changed while integrating: a cut now eats at most maintenance. A small
body can have a TDEE below the absolute calorie floor, where "raise to the
floor" turned a cut into a surplus. The floor now stops at TDEE.

## What is still not here

The model sets calorie and protein targets, BMR, and the weekly training
prescription. It does not rebuild the meal plan or the exercise list: every
Hunter still starts from the plans in `src/lib/data/seed.ts`. That needs the
food and exercise libraries, which do not exist yet. Until they do, Confirm says
plainly when the starting meal plan and the calculated target disagree.

The food and exercise libraries are also not built. Those are needed either
way: the numbers above are targets, and something still has to turn 1982 kcal
and 136 g of protein into meals, and 73 weekly sets into exercises.
