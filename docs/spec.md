# Winter Arc Tracker — App Spec

A gamified fitness + diet tracker inspired by the "System" from Solo Leveling. Every workout, meal, and habit completed feeds into a level/XP system. Visual style: **Futuristic**.

---

## 1. Concept

The user ("Hunter") is grinding a "Winter Arc" starting October — rebuilding strength and cutting fat after months off. The app is styled as a System interface that tracks daily quests (workouts, meals, cardio) and rewards completion with XP, levels, and stat growth, echoing the Solo Leveling power-fantasy loop.

**Tone:** System notifications should feel like in-universe messages — short, declarative, slightly dramatic. E.g. "Quest Complete: Leg Day," "Stat Increased: STRENGTH +1," not generic "Nice job!" praise.

---

## 2. User Profile Data (seed data)

| Field | Value |
|---|---|
| Name | Harshith RK |
| Height | 175.5 cm |
| Starting Weight | 95.5 kg |
| Target Weight | 72.7 kg |
| BMI (start) | 31.0 |
| Body Fat % (start) | 35.3% |
| Skeletal Muscle Mass (start) | 34.9 kg |
| Visceral Fat Level (start) | 14 |
| BMR | 1705 kcal |
| Diet type | Vegetarian, no eggs, no whey, budget-conscious |
| Gym window | 7:00–9:00 PM daily |
| Arc start | October |

These seed values populate the initial "Hunter Stats" screen and the weight/body-fat history chart. All fields should be editable — this is a snapshot, not a hardcoded constant.

---

## 3. Core Systems

### 3.1 Level & XP System
- Hunter starts at **Level 1, Rank E** (Solo Leveling rank tiers: E → D → C → B → A → S).
- XP awarded per completed task (see table below). Leveling curve: `XP to next level = 100 * current_level` (adjustable).
- Rank-up occurs every 10 levels, with a distinct full-screen "Rank Up" animation/modal.
- Stats to track and grow (cosmetic, tied to consistency, not real biometrics):
  - **STRENGTH** — grows from completed workout sets
  - **STAMINA** — grows from completed cardio sessions
  - **DISCIPLINE** — grows from diet adherence (meals logged as eaten)
  - **VITALITY** — grows from sleep/recovery logging (optional future field)

| Action | XP Reward |
|---|---|
| Complete 1 exercise (all sets) | 10 XP |
| Complete full workout day | 50 XP bonus |
| Log a planned meal as eaten | 8 XP |
| Complete all meals in a day | 40 XP bonus |
| Complete daily cardio (200 kcal) | 15 XP |
| 7-day full-completion streak | 200 XP + "Streak Shield" badge |
| Log weekly weigh-in | 20 XP |

### 3.2 Streak System
- Daily streak counter for: workout adherence, diet adherence, cardio adherence (tracked separately, shown together).
- Missing a scheduled task breaks that streak (rest days don't count against streak).
- Visual: streak flame/counter with the count, styled boldly per the futuristic system-UI theme (not a soft rounded badge).

### 3.3 Quest Log (Daily View)
Each day auto-generates a checklist ("Daily Quest") based on the day of week:

- **Workout quest** — list of exercises for that day (from Section 5), each with its own checkbox, sets/reps shown, and an optional weight-used input field.
- **Diet quest** — each meal from the meal plan (Section 6) with a checkbox for "eaten," and optional actual-macros override if they swapped something.
- **Cardio quest** — single checkbox + kcal input (default 200).
- Completing all three quest categories in a day triggers a "Daily Quest Complete" celebration (full-screen or banner, System-notification style).

### 3.4 System Notifications
Trigger a stylized pop-up / toast for:
- Quest complete (per exercise/meal)
- Daily quest fully complete
- Level up
- Rank up
- Streak milestones (3, 7, 14, 30 days)
- New personal record (if weight lifted for an exercise exceeds prior logged value)

Copy should read like system messages, e.g.:
> `[Quest Complete] Back Day cleared. +50 XP.`
> `[Level Up] You have reached Level 4.`
> `[Notice] New PR on Deadlift: 80kg.`

---

## 4. Screens / Pages

1. **Hunter Status** (home/dashboard)
   - Level, Rank, XP bar, the 4 stats as bars, current streaks, today's quest summary, weight/target progress bar.
2. **Daily Quest** (main interaction screen)
   - Today's workout checklist, meal checklist, cardio checklist — all tickable.
3. **Workout Log**
   - Full week view (Mon–Fri split), tap into any day to see/edit exercises, sets, reps, and log weights used per session (history per exercise).
4. **Diet Log**
   - Full day's meal plan with macros per meal, running daily macro/calorie total vs. target, editable food items.
5. **Progress / Stats**
   - Weight trend chart, body fat % trend, BMI trend (manual entry weekly, mirrors InBody-style tracking), XP/level history.
6. **Achievements**
   - Badge wall: streak shields, PR badges, rank-up trophies, "arc milestones" (e.g., first full week completed, first month).

---

## 5. Workout Data (finalized routine)

**Monday — Back**
- Pull Ups — 4×12
- Bent Over Barbell Rows — 4×12-15
- Neutral Grip Lat Pulldown — 4×12-15
- Straight-Arm Pulldown — 4×12-15
- Seated Rowing — 4×12-15
- Hyperextension — 4×12 (or Deadlift — 4×12)

**Tuesday — Shoulders**
- Military Press — 4×12-15
- Lateral Raises — 4×15-20
- Barbell Front Raises — 4×12-15
- Dumbbell/Cable Upright Row — 4×12-15
- Face Pulls — 4×12-15

**Wednesday — Biceps & Triceps**
- Alternate Dumbbell Curls — 4×12-15
- Hammer Curls — 4×12
- Preacher Curls — 4×12
- Single Arm Curls (Cable) — 4×12 (or Concentration Curls — 4×12)
- Single Arm Tricep Pushdown (Sideways) — 4×12-15
- Skull Crushers — 4×12-15
- Rope Triceps Pushdown (Double Hand) — 4×12-15
- Dips — 4×12-15

**Thursday — Chest**
- Flat-Bench Press — 4×12-15
- High To Low Cable Fly's — 4×12-15
- Low To High Cable Fly's — 4×12-15
- Shoulder High Cable Fly's — 4×12-15
- Incline Smith Press — 4×12-15
- Decline Press — 4×12-15

**Friday — Legs**
- Squats — 4×12
- Leg Extensions — 4×12-15
- Leg Curls — 4×12-15
- Leg Press — 4×12-15
- Lying Hamstring Curls — 4×12-15
- Romanian Deadlift — 4×10-12
- Calf Raises — 4×15-20

**Sat/Sun** — Rest (optional abs/cardio if free — should appear as an optional bonus quest, not mandatory, so it doesn't break streaks if skipped).

Each exercise entry in the data model should store: `name`, `targetSets`, `targetReps`, `muscleRegion` (e.g. "Lats", "Rear Delts"), and a `history` array of `{date, weightUsed, setsCompleted}`.

---

## 6. Diet Data (finalized plan)

Vegetarian, no eggs, no whey, budget-friendly. Target: ~1950–2100 kcal, ~150–160g protein (current working version runs ~2445 kcal / ~145g protein — flagged as an accepted trade-off to protect protein without whey).

| Time | Meal | Protein | Carbs | Fat | Calories |
|---|---|---|---|---|---|
| 7:00 AM | Besan chilla (2, 50g besan) + milk (200ml) | 17g | 39g | 15g | 360 |
| 10:00 AM | Curd (200g) + roasted chana (30g) | 13g | 27g | 10g | 230 |
| 1:00 PM | Soya chunks curry (70g dry) + rice (75g cooked) + dal (150g cooked) | 49g | 62g | 12g | 558 |
| 5:00 PM | Sprouts chaat (100g) + roasted chana (15g) | 10g | 28g | 1g | 160 |
| 6:15 PM (pre-workout) | Banana + roasted chana (15g) | 4g | 36g | 1g | 160 |
| 9:15 PM (post-workout) | Milk (250ml) + banana | 9g | 39g | 9g | 258 |
| 9:30 PM | Paneer sabzi (110g paneer) + dal (150g cooked) + besan chilla (2, 60g besan) | 43g | 46g | 40g | 719 |
| **Total** | | **~145g** | **~277g** | **~88g** | **~2445 kcal** |

Each meal entry should store: `time`, `name`, `items` (list), `protein`, `carbs`, `fat`, `calories`, and an `eaten` boolean per day.

**Weekly shopping list** (for a "Supplies" or shopping-list section, optional):
Soya chunks, besan, paneer, dal (rajma/chana/moong/toor, rotate), curd, milk, roasted chana, sprouts, bananas, rice.

---

## 7. Design Direction — Futuristic

**Do:**
- Bold, thick black borders (3–4px) on all cards/panels.
- Hard drop shadows (offset, no blur — e.g. `box-shadow: 6px 6px 0px #000`), not soft rounded shadows.
- High-contrast, saturated accent colors against a stark base (e.g. off-white or black background) — think RPG-system-UI energy (electric blue, violent violet, or blood red as the "System" accent), not pastel.
- Zero or near-zero border-radius — sharp corners throughout.
- Large, blocky typography for headers (a strong grotesque or slab face); monospace acceptable for stat numbers/data readouts to reinforce the "system UI" feel.
- Visible, chunky UI elements: thick checkboxes, big tappable buttons with hard shadows that "press down" (shadow disappears / button shifts) on click.
- XP bars and stat bars styled as thick, segmented, blocky progress bars — not smooth gradients.

**Avoid:**
- Soft shadows, rounded cards, pastel gradients — this breaks the aesthetic.
- Overly busy decoration; the boldness should live in structure (borders, blocks, type) not clutter.

**Visual Hierarchy — critical constraint:**
The futuristic style is bold, but bold does not mean everything shouts at once. A common failure mode is every card, border, and text block competing at the same visual weight, making the screen feel cluttered and hard to scan. To avoid this:
- Establish ONE primary focal point per screen (e.g. on Hunter Status, that's the Level/XP bar; on Daily Quest, that's today's progress summary). Everything else is visually secondary.
- Use size and weight to create clear tiers: hero elements (large, high-contrast, thick border) → section headers (medium, bold, thinner border) → list items/checkboxes (compact, minimal border weight) → metadata/labels (small, muted, no border).
- Not every element needs a thick border and a hard shadow — reserve the heaviest treatment (thick border + offset shadow) for 1-2 elements per screen (the focal card, a primary CTA). Secondary content can use a single thin border or no border at all, relying on spacing to separate it.
- Generous whitespace/padding between blocks is part of the futuristic toolkit too — don't pack cards edge-to-edge. Breathing room is what makes the bold elements read as bold instead of everything blurring into noise.
- Group related items (e.g. all exercises in one workout) under a single shared container rather than giving every individual exercise its own fully-bordered, fully-shadowed card — nest lighter-weight rows inside one bold parent card instead.
- Limit accent color usage to what's meaningful (XP, success, danger/streak-break) — don't apply the accent color decoratively across unrelated UI chrome, or it stops signaling anything.
- When handing this spec to a UI generation tool, explicitly state: "Only the primary focal element per screen gets the heaviest border+shadow treatment; everything else should be visually quieter" — this constraint needs to be spelled out or it defaults to treating every element as equally important.

**Suggested palette (starting point, refine when building):**
- Background: `#0B0B0B` (near-black) or `#F5F0E6` (stark off-white) — pick one as dominant base
- Primary accent (System color): `#3D5AFE` (electric blue) or `#7C3AED` (violent violet)
- Danger/streak-break: `#FF3B30`
- Success/XP: `#00E676`
- Text: pure black or pure white depending on base, no grey-on-grey low contrast

**Typography:**
- Headers: a bold slab or grotesque display face (e.g. Archivo Black, Space Grotesk Bold)
- Body: a clean grotesque (e.g. Inter, IBM Plex Sans)
- Stat numbers / system readouts: monospace (e.g. JetBrains Mono, Space Mono)

---

## 8. Data Persistence Notes (for Claude Code / Claude Design build)

- All quest completions, XP, levels, streaks, and logged history (weights used, weigh-ins, meal adherence) need to persist across sessions — use whatever storage the build environment provides (local storage, a small backend, or file-based state), since this is meant to be used daily over months.
- Data model should separate **static plan data** (the workout/diet templates in Sections 5–6) from **daily log data** (what was actually completed/eaten/lifted each date), so history can be tracked against the plan.
- The user should be able to edit the static plan (swap an exercise, change a meal) without losing past log history.

---

## 9. Out of Scope (for now)
- Social/leaderboard features
- Automatic calorie/macro calculation from barcode scanning
- Wearable device integration
