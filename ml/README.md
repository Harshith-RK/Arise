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

## Plans built from the targets

The targets now become real plans. `src/lib/plan/library/` holds the content,
`generate-diet.ts` and `generate-workout.ts` turn targets into plans, and
`build.ts` is the single entry point.

**Food library:** 72 foods, per 100 g as eaten (IFCT 2017 for Indian staples,
USDA otherwise), tagged vegan / vegetarian / egg / meat, whey and high-sodium.
Calories are derived from the macros so meals always add up. **31 meal
templates** are dish shapes whose components list foods in preference order, so
one template becomes chicken for one Hunter and paneer for another.

**Diet generation:** slots are scheduled around the gym window (a main meal
right after training becomes the post-workout meal), macros are shared across
slots by purpose, each slot takes the best-fitting dish the diet allows while
avoiding repeats, portions are solved by bounded least squares and snapped to
measurable steps, then nudged across the whole day. A non-vegetarian is steered
toward meat or fish at main meals; high blood pressure removes high-sodium
foods. It also writes the week's supplies list.

**A different day for every weekday.** Plans store meals per weekday
(`DietPlan.days`), with `meals` kept as the fallback so every older plan still
loads. Each day is generated with memory of the week: yesterday's dish in the
same slot is penalised hardest, dishes and proteins already used that week
less. If a day comes in short on protein or off on calories, it is rebuilt with
the week's penalties weaker, down to ignoring them, but never with yesterday's
plate allowed back, since that is the repeat people notice.

Measured over 576 weeks (4,032 generated days; both sexes, 45 to 150 kg, all
goals, both diets, two equipment tiers, three schedules):

| | |
|---|---|
| calorie miss per day, mean / worst | 1.0% / 6.5% |
| protein short by more than 5% | 0.2% of days (tests hold every sampled day within 6%) |
| a day identical to the day before | 0 |
| distinct dishes per week | 25 |
| time to build a week | ~40 ms |

Protein is allowed to run over and not under, because over is harmless and
under costs muscle. The hardest case, a large vegetarian with no eggs or whey
at a high protein target, is why the library gained moong dal chilla, paneer
paratha, a sprouts bowl, a curd parfait, tikka, soya chaat and makhana: without
enough protein-dense vegetarian dishes, variety and protein could not both be met. Getting there took two fixes
worth knowing: portion caps now grow with very high targets, and the per-meal
balance term had to be weakened, since at full strength it cancelled every
day-level correction on high-carbohydrate days.

**Budget and availability.** Every food carries an approximate Indian retail
price (kirana, sabzi market and local meat shop prices, per 100 g as eaten) and
where it can be bought: everyday, city or specialty. Plans use everyday foods
only, plus whey for a Hunter who takes it. Cost weighs against a dish when
choosing and sizing (0.01 per rupee, swept against 0.006 and 0.015), and daily
limits keep a cheap plan sensible: soya chunks 60 g dry, oil 30 g, ghee 15 g,
milk powder 50 g, whey 60 g. Any dairy dish can take a stir-in of milk powder,
or whey for someone who takes it, which the solver leaves at 0 unless the day
needs the protein. Over 360 generated weeks:

| | before | after |
|---|---|---|
| cost per day | about ₹270 to ₹290 | ₹128 vegetarian, ₹139 non-veg, ₹150 with whey |
| foods not sold everywhere | tofu, tempeh, quinoa, broccoli, hummus, olive oil and more | none |
| days over a daily limit | not tracked (a day reached 165 g soya) | 0 of 2,520 |
| calorie miss, worst | 4.0% | 4.6% |

The limit that costs something: a vegetarian with no eggs and no whey at a very
high protein target (130 kg on a cut wants 223 g) reaches about 211 g on
everyday foods. The plan preview says so, and eggs or whey close it.

**Exercise library:** 80 movements tagged by muscle, region, gear, skill,
aggravated injuries and swaps. Every muscle has a no-equipment option.

**Workout generation:** the split is laid over the Hunter's actual training
days, each muscle's weekly sets are divided across the sessions that train it
(generated weekly sets match the model's prescription), and movements are
ranked by fit: loaded work over floor work when gear exists, compounds leading
for big muscles and isolation for arms and delt heads, skill matched to
experience, a light repeat penalty, and a second movement for the same muscle
hitting a different region only when that costs little. Swaps become the
variants a Hunter can switch to. Sessions are trimmed to the gym window.

**In the app:** onboarding builds both plans and the supplies list, previews
them on Confirm, and installs them as version 1. Existing Hunters build them
from System, Targets, preview, and confirm; they save as new versions, and past
days keep the plan they were logged against.

**Refusals** build meals only from the numbers the Hunter entered, and train at
the gentlest prescription (beginner volume, maintenance).
