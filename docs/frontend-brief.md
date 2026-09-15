# WINTER ARC SYSTEM : FRONTEND BUILD BRIEF

> Source of truth for the frontend build. Saved verbatim from the owner's brief so it survives
> across sessions. If code and this file disagree, this file wins. Seed data and game rules come
> from docs/spec.md sections 2, 3, 5 and 6 (its section 7 visual direction is void).

You are the lead design engineer building the complete frontend of "Winter Arc", a gamified
fitness and diet tracker inspired by the System from Solo Leveling. One real user uses it daily
for 90+ days, mostly on a phone at the gym between 7 and 9 PM. The build must be production
grade, fully working, and visually distinctive. Every page, button, form, and state works.
Nothing is a placeholder.

The product spec is at docs/spec.md. Use its sections 2, 3, 5 and 6 as the source of truth for
seed data and game rules, with the corrections listed in this brief. IGNORE its section 7 visual
direction entirely. This brief replaces it.

The project: Next.js 16 (App Router, src/, Turbopack), React 19, Tailwind v4, TypeScript,
motion 13. AGENTS.md says this Next.js has breaking changes. Before writing any Next code, read
the relevant guides in node_modules/next/dist/docs/ and follow them over training memory.

------------------------------------------------------------------------------------------------
## 0. SKILLS AND TOOLS: WHEN TO USE EACH
------------------------------------------------------------------------------------------------

Use these in this order. Each has one job. If two ever disagree, THIS BRIEF WINS.

1. impeccable
   - Start: run `init` to write PRODUCT.md from this brief, then `shape` for the app shell and
     the Quest screen before any code. Mode for /app/* is Operate. Mode for the landing page
     is Persuade.
   - Read its craft-floor reference before every UI edit.
   - End: run `critique`, then `audit`, then `harden`, then `polish`. Fix everything in one batch.
2. design-taste-frontend (taste skill)
   - Run its pre-flight anti-slop check on every screen before you call that screen done.
3. emil-design-eng
   - Governs every component interaction and motion decision: easing, durations, interruptibility,
     press feedback, what should NOT animate. Use Sonner for toasts and Vaul for bottom sheets,
     both by Emil Kowalski, fully restyled to this system.
4. ui-ux-pro-max
   - Use ONLY its UX domain, the `nextjs` and `react` stack guidelines, and its pre-delivery
     checklist. Do NOT use its palettes, font pairings, styles or --design-system output. The
     visual world is fixed by this brief.
5. 21st.dev MCP
   - Use only to borrow MECHANICS (number roll logic, gesture handling, list reordering). Restyle
     100% to these tokens. Reject any 21st component that brings a banned pattern (glows, orbs,
     bento, gradients, rounded cards, glass).
6. Motion (motion/react) handles component-level motion: state changes, layout, AnimatePresence,
   gestures, springs, shared layoutId elements.
7. GSAP 3.13+ with @gsap/react (useGSAP) handles choreographed timelines and motion graphics:
   ceremonies, SVG drawing, text splitting, scroll-scrubbed storytelling. Plugins: SplitText,
   ScrambleTextPlugin, DrawSVGPlugin, MotionPathPlugin, CustomEase, ScrollTrigger, Flip.
   Register once in src/lib/gsap.ts. Never let Motion and GSAP animate the same element.

Also install: sonner, vaul, cmdk, zustand, dexie, dexie-react-hooks, zod, date-fns, d3-shape,
d3-scale, radix-ui (primitives for dialog, tabs, popover, switch, slider), @serwist/next (PWA),
vitest, @playwright/test.

------------------------------------------------------------------------------------------------
## 1. HARD BANS (a violation of any of these fails the build)
------------------------------------------------------------------------------------------------

Visual:
- No box-shadow anywhere. No drop shadows, no glows, no colored shadows. Depth comes from tone
  steps and hairlines only. Focus rings use `outline`.
- No border-radius above 0. Sharp corners everywhere. Chamfered corners via clip-path are the
  only shape exception.
- No gradients. The only exception is the grain texture. Progress and heat are shown in
  discrete solid steps, never a blend.
- No glassmorphism, liquid glass, backdrop-filter blur.
- No neon or fluorescent colors. No pastels. No rainbow or multi-hue decoration. No
  purple-and-black scheme. No pure white (#FFF) background.
- No radial orbs, blobs, glow spots, dot grids, grid-paper backgrounds.
- No bento grids. No row of three feature cards. No colored left-border strips on cards or rows.
- No terminal windows, fake code editors, or fake command-line chrome.
- No Inter, Geist, Space Grotesk, Space Mono, Roboto, Poppins, Montserrat.
- No Lucide, Heroicons, Tabler, Feather or any stock icon pack. No emoji anywhere. No sparkle
  icons. No checkmark bullets in lists. No animated arrows.

Behavior:
- No hover animations. Hover states exist on pointer devices only
  (`@media (hover: hover) and (pointer: fine)`) and change color/background instantly
  (transition: none). Nothing moves on hover. Motion happens on press, commit, navigation and
  system events.
- No layout-shifting animation. Animate transform, opacity, clip-path and SVG stroke only.

Copy:
- No em dashes or en dashes in any UI string, meta tag or doc the app ships.
- No "It's not X, it's Y" constructions. No "Unlock", "Elevate", "Seamless", "Supercharge",
  "Journey", "Game-changer". No exclamation marks outside system ceremonies.
- No fake testimonials, no pricing tiers, no invented stats or user counts.

Required (their absence counts as slop):
- A real, interactive product demo on the landing page (the real Quest component, not a video).
- Designed loading states, empty states, error states and offline state for every data surface.
- /legal/terms and /legal/privacy pages with real, plain-language content for a local-first app.

Add a `npm run slop-check` script that greps src/ and fails on: `box-shadow`, `shadow-`,
`rounded-` (except `rounded-none`), `backdrop-blur`, `bg-gradient`, `linear-gradient`,
`radial-gradient`, `lucide`, `heroicons`, the characters U+2014 and U+2013, and emoji ranges.

------------------------------------------------------------------------------------------------
## 2. CONCEPT: THE THERMAL SYSTEM
------------------------------------------------------------------------------------------------

Winter Arc means the world is frozen and your effort is the only heat source. The System is
reimagined as a precision instrument panel: part aerospace avionics, part F1 telemetry, part
Solo Leveling status window. Cold, exact and quiet by default. Every completed rep, meal and
cardio session adds heat. The UI literally warms as the Hunter levels and ranks up.

Three rules drive every decision:
1. Cold is the default. Unfinished things look frozen: desaturated, steel, still.
2. Heat is earned. Ember color appears only where effort happened: completed quests, XP,
   streaks, primary actions. If ember is used decoratively, it stops meaning anything.
3. One focal point per screen gets the heaviest treatment. Everything else is quieter.

Solo Leveling vocabulary is used in copy, never as costume: Hunter, Rank, Gate, Quest, Penalty,
Awakening, System notice. No fantasy fonts, no fake runes, no anime art.

------------------------------------------------------------------------------------------------
## 3. COLOR TOKENS
------------------------------------------------------------------------------------------------

Define in src/app/globals.css with Tailwind v4 @theme. Components use tokens only, never raw hex.

Skin 1: PERMAFROST (default, dark)
  --ink-0   #0A0D0F   page ground (teal-black, never purple)
  --ink-1   #0F1417   panel
  --ink-2   #151C20   raised surface, inputs, wells
  --ink-3   #1D262B   active row, empty meter cell
  --line-1  #222C31   hairline dividers
  --line-2  #33414A   strong rules, focal frame
  --frost-0 #E4ECEE   primary text
  --frost-1 #A7B6BC   secondary text
  --frost-2 #6C7C83   metadata, disabled (captions only, min 12px)
  --ember   #F2551D   heat: XP, completion, primary action, active streak
  --ember-2 #9E3312   heated track
  --ember-3 #3A1A0E   cooled ember, pending heat
  --core    #FFD7B5   white heat: the single hottest pixel (leading meter cell, rank S)
  --glacier #7FA6B5   cold states: rest day, frozen streak, info notices
  --brass   #C8A45A   achievements, PRs, rank plaques
  --fault   #E0344F   penalty, streak break, over-limit, destructive

Skin 2: WHITEOUT (light, selectable in System settings)
  --ink-0 #E7EAE6  --ink-1 #EEF0EC  --ink-2 #F4F5F2  --ink-3 #DDE1DC
  --line-1 #CDD3CE  --line-2 #9BA6A2
  --frost-0 #0E1316  --frost-1 #3E4A4F  --frost-2 #66747A
  --ember #CF4410  --ember-2 #E9A184  --ember-3 #F3D3C4  --core #7A2406
  --glacier #3F6878  --brass #8A6A22  --fault #B8203A

Follow system preference by default, allow manual override, persist the choice.

RANK TEMPERATURE (the signature idea): the ember token is driven by the current rank through
one CSS variable, --temp (0 to 5). The app gets warmer across the arc:
  E  Frozen      ember #8A6A5C  (ash, barely warm; the UI feels cold on day 1)
  D  Kindled     ember #C0582B
  C  Burning     ember #E2561F
  B  Forged      ember #F2551D  + brass trim on focal frame
  A  Molten      ember #FF6A2B
  S  White Heat  ember #FF7A36, --core used on hero numerals, brass frame
--ink-0 also warms very slightly from #0A0D0F (E) to #100D0B (S). Whiteout gets an equivalent
ramp. All pairs must pass WCAG AA. Verify with a script in /scripts/contrast.ts.

Color is never the only signal. Every state also changes shape, label or pattern.

------------------------------------------------------------------------------------------------
## 4. TYPOGRAPHY
------------------------------------------------------------------------------------------------

Two families, loaded with next/font (self-hosted, display: swap, preload the display cut).

- Archivo (variable: wdth 62 to 125, wght 100 to 900)
  - Display: wdth 125, wght 800, uppercase, tracking -0.01em. Screen titles, ceremony titles.
  - Numerals: wdth 62, wght 700. Giant stat numbers (level, streak, weight). Tall and narrow
    like race timing boards. Always tabular.
  - Body/UI: wdth 100, wght 400/500/600. Tracking -0.005em.
- Martian Mono (variable wdth 75 to 112.5, wght 300 to 800)
  - System readouts: labels, units, timestamps, XP chips, table data, notices.
    Uppercase, wght 500, tracking +0.08em, 11 to 13px.

Scale (mobile / desktop):
  hero-num   88 / 128px  lh 0.85   Archivo wdth 62
  display-1  40 / 56px   lh 0.95   Archivo wdth 125
  display-2  28 / 36px   lh 1.0
  title      20 / 22px   lh 1.2    Archivo wdth 100 wght 600
  body       16 / 16px   lh 1.5
  small      14 / 14px   lh 1.45
  readout    12 / 12px   lh 1.3    Martian Mono
  micro      11 / 11px   lh 1.3    Martian Mono, captions only

Global: `font-variant-numeric: tabular-nums` on all numbers. `text-wrap: balance` on headings,
`text-wrap: pretty` on paragraphs. Body text never below 16px on mobile.

------------------------------------------------------------------------------------------------
## 5. GEOMETRY, SURFACES, TEXTURE, ICONS
------------------------------------------------------------------------------------------------

Grid: 4px base. Spacing scale 4, 8, 12, 16, 24, 32, 48, 64, 96. Mobile gutters 16px, desktop
content max 1200px with a 240px left rail.

Surface tiers (hierarchy without shadows):
  T0 Ground   --ink-0 plus a static grain layer (SVG feTurbulence, 3% opacity, fixed)
  T1 Well     --ink-2, no border. Inputs, meter tracks, inline data.
  T2 Panel    --ink-1, 1px --line-1 border. Standard grouping container.
  T3 Focal    --ink-1, 1px --line-2 border, 10px chamfer on top-right and bottom-left corners
              (clip-path, with the border drawn as an SVG path overlay so it survives clipping),
              plus four 12px corner ticks in --frost-2. ONE per screen.

Rows inside a panel have no borders. They are separated by 1px --line-1 dividers inset 16px.
Never put a bordered card inside a bordered card.

Iconography: draw a custom set as React SVG components in src/components/icons/.
20px grid, 1.5px stroke, square caps, miter joins, no fills except state glyphs. About 22
icons: status, quest, log, progress, system, dumbbell, meal, cardio, scale, streak (an angular
flame built from 3 straight segments), shield, seal, trophy plaque, plus, minus, close, back
(static chevron), settings, export, import, timer, lock, undo.
The quest completion glyph is a filled square with one chamfered corner, never a checkmark.

Rank plaques: custom SVG hexagonal plaques with the rank letter as vector paths, used on
Status, the Rank Up ceremony and Trophies.

------------------------------------------------------------------------------------------------
## 6. INFORMATION ARCHITECTURE AND ROUTES
------------------------------------------------------------------------------------------------

Mobile: fixed bottom nav, exactly 5 items, 64px tall plus safe-area inset, labels always shown.
Desktop (1024px+): left rail with the same 5 items plus the Hunter mini-card. The CORE gauge
(XP meter) lives in the top app bar on every /app page and is a persistent element that never
remounts (Motion layoutId), so XP flights always have a target.

Nav: STATUS, QUEST, LOG, PROGRESS, SYSTEM. After onboarding the app opens on QUEST.

Routes:
  /                          Landing (Persuade)
  /awaken                    First-run onboarding (5 steps)
  /app/quest                 Today's Daily Quest (default)
  /app/quest/[date]          Any past or future day (read-only for future days)
  /app/status                Hunter Status dashboard
  /app/log                   Tabs: Workout | Diet
  /app/log/workout/[day]     One training day (mon to fri, sat/sun bonus)
  /app/log/exercise/[id]     Exercise history, PR record, e1RM chart
  /app/log/diet/supplies     Weekly shopping list
  /app/progress              Tabs: Telemetry | Trophies
  /app/progress/trophies/[id]  Achievement detail
  /app/system                Hunter profile, preferences, data
  /app/system/plan/workout   Workout plan editor
  /app/system/plan/diet      Diet plan editor
  /legal/terms, /legal/privacy
  not-found.tsx, error.tsx (per segment), offline fallback page

------------------------------------------------------------------------------------------------
## 7. PAGE SPECS (focal element, contents, every control and what it does)
------------------------------------------------------------------------------------------------

### / Landing
Focal: a live, fully interactive Quest panel running on an isolated sandbox store (resets on
reload, never touches real data).
- Hero: display-1 headline "Ninety days. One System. Every rep logged." with a one-line subhead
  and the live demo panel beside it (below it on mobile). Tapping quests in the demo fires the
  real ignite animation, XP flight and a real System notice.
- "How the System works": a GSAP ScrollTrigger pinned sequence, single column, 4 steps that
  scrub as you scroll: Quest appears > Hunter completes it > Heat transfers to CORE > Level rises.
  The same SVG instrument is drawn and redrawn across the steps. No cards.
- "The Arc": a 90-day horizontal strip that fills with heat on scroll (scrubbed), with rank
  thresholds marked in Martian Mono.
- Final CTA: "Begin Awakening" (primary) goes to /awaken, or to /app/quest if a profile exists.
- Footer: Terms, Privacy, version number, "Local-first. Your data stays on this device."
Buttons: Begin Awakening, Try the demo (scrolls to the demo and focuses it), Terms, Privacy.

### /awaken Onboarding
Opens with the Awakening boot sequence (section 9.A), then 5 steps in one T3 panel with a
segmented step meter:
  1 Identity: name (prefilled "Harshith RK"), height, current weight, target weight.
  2 Body scan: body fat %, skeletal muscle, visceral fat, BMR (prefilled from spec, editable).
  3 Training window: gym time window, rest days.
  4 Diet profile: vegetarian, no eggs, no whey, calorie and protein targets.
  5 Confirm: summary readout, "Accept the System" commits and routes to /app/quest.
Controls: Back, Next (disabled until valid, zod validation, inline errors under fields),
Skip scan (step 2 only), Accept the System. Enter advances. State survives refresh.

### /app/quest Daily Quest (the most important screen; design for a sweaty thumb)
Focal: Today header panel (T3) with date, "ARC DAY 12 / 90", three category meters
(Workout 4/6, Diet 5/7, Cardio 0/1) and today's XP earned.
Below, three T2 panels: WORKOUT (today's split), DIET (7 meals), CARDIO. Only the active
category is expanded; finished categories collapse to one summary line with a Motion layout
animation.
- Quest row: min 64px tall, the whole row is the target. Name, sets x reps target, and ghost
  text "LAST 60 KG x 12". Tap row to complete. Mobile: swipe right to complete, swipe left to
  open details, with rubber-banding past thresholds and a haptic tick at the commit point.
- Weight entry: a horizontal stepper [ - ] 62.5 KG [ + ] prefilled with last session. Step 2.5,
  press-and-hold accelerates. Tapping the number opens a numeric keypad sheet (Vaul).
  Per-set logging: 4 set pills per exercise, tap each as done.
- Rest timer: when a set is logged, a 90s timer docks above the bottom nav. Tap to pause,
  long-press to reset, +30s button. Plays an optional tone at zero.
- Exercise variants (Hyperextension or Deadlift etc.): a segmented switch in the row detail.
  History attaches to the chosen variant.
- Diet rows: time, meal name, macros readout. Tap to mark eaten. "Swapped?" opens a sheet to
  override macros for today only. Show 9:15 PM and 9:30 PM meals grouped as one
  "Post-workout block" with an expand control.
- Cardio row: tap to complete, kcal stepper default 200, minutes field.
- Weekend: workout panel shows "BONUS QUEST: Abs or cardio. Optional. Streak is banked."
- Penalty zone: after 22:00 with mandatory quests open, a --fault banner with a live
  countdown to 23:59: "PENALTY ZONE. 1H 42M TO CLEAR TODAY'S GATE."
- Every completion shows a Sonner System notice with an UNDO action (5s). Undo fully reverses
  XP, stats and streak.
- Day navigation: previous/next day arrows (static) and a date button opening a month sheet.
Keyboard (desktop): J/K move focus, Space completes, E edits weight, U undoes, Cmd+K opens
the command palette.

### /app/status Hunter Status
Focal: Hunter Card (T3): rank plaque, name, title, LEVEL in hero-num, CORE meter full width.
- Stats block: STRENGTH, STAMINA, DISCIPLINE, VITALITY as segmented bars in T1 wells.
  VITALITY is locked (lock glyph, "UNLOCKS AT LEVEL 5") until level 5, then asks for sleep
  hours and water in the Daily Quest.
- Streak trio: Workout, Diet, Cardio. Each shows count and state: BURNING / BANKED / BROKEN.
- Body readout: current weight, target, delta, with a single progress rule marked at start,
  current and Phase 1 target. Shows TDEE estimate vs planned intake vs deficit.
- Today summary line: "2 OF 3 GATES CLEARED" linking to /app/quest.
Controls: tap any stat for a popover explaining how it grows; tap streak to see its calendar;
"Log weigh-in" opens the weigh-in sheet.

### /app/log Workout tab
Focal: the week strip Mon to Sun, today highlighted with ember.
Each day is one T2 panel listing its exercises as plain rows. Tap day > /app/log/workout/[day].
Day page: exercise list with targets, last session weights, drag to reorder (Motion Reorder),
"Start today's session" jumps to /app/quest. Tap exercise > /app/log/exercise/[id].
Exercise page: PR record (brass), e1RM chart (custom SVG), session history table, edit and
delete for each history entry (delete asks for confirmation in a sheet).

### /app/log Diet tab
Focal: macro instrument, 4 horizontal meters (Protein, Carbs, Fat, kcal) against targets.
Protein turns brass at target. kcal turns --fault past target.
Meals as a vertical timeline with times in Martian Mono on a 1px rail. Tap meal to edit items
and macros (edits the plan, logged history is kept). "Supplies" > /app/log/diet/supplies:
checklist of weekly items, "Reset week" button, items editable, persisted.

### /app/progress Telemetry tab
Focal: the weight trend chart.
- Weight line (d3-shape curveMonotoneX, 1.5px ember stroke) with the target as a dashed
  brass rule. It draws on with GSAP DrawSVG, and on scroll the milestones reveal (ScrollTrigger).
- Body fat % and BMI as smaller sparklines. XP and level history as a stepped line.
- Range switch: 4W / 12W / ALL.
- "Log weekly weigh-in" (T3 CTA shown only when due) opens a sheet: weight, body fat,
  muscle, visceral, awards 20 XP.
Tooltips: crosshair plus a readout chip, keyboard accessible (arrow keys move between points).

### /app/progress Trophies tab
Grid of rank plaques and seals (4 per row desktop, 3 mobile, equal squares, no bento).
Locked: 1px --line-2 outline, silhouette, progress readout "12 / 30 DAYS".
Unlocked: brass stroke, name, date earned. Tap > detail page with how it was earned.

### /app/system
Sections as plain grouped rows: Hunter profile (edit all seed fields), Skin (Permafrost /
Whiteout / System), Motion (Full / Reduced / follow OS), Sound (off by default), Haptics,
Rest timer length, Plan editors (links), Data: Export JSON, Import JSON (validated with zod,
preview before replace), Reset arc (type "RESET" to confirm), About, Terms, Privacy.
Every control persists immediately and shows a quiet System notice.

### /legal/terms and /legal/privacy
Read mode. Single 680px column, real content: local-first storage, no tracking, export and
delete rights, future sync disclosure. Last updated date. Anchor table of contents.

### not-found, error, offline
404: "GATE NOT FOUND. This route does not exist." with Return to Quest.
Error: "SYSTEM FAULT. The log could not be read." with Retry and Export data.
Offline: the app works fully offline. Show a small "OFFLINE. CHANGES SAVED LOCALLY." readout
in the app bar. No blocking page.

------------------------------------------------------------------------------------------------
## 8. MOTION SYSTEM
------------------------------------------------------------------------------------------------

Principles (follow emil-design-eng): motion explains cause and effect. Frequent actions are
fast. Ceremonies are rare, earned and skippable. Exits are faster than entrances. Every
animation is interruptible. Nothing loops for decoration.

Tokens (src/lib/motion.ts):
  ease.out       cubic-bezier(0.23, 1, 0.32, 1)
  ease.in        cubic-bezier(0.55, 0, 1, 0.45)
  ease.inOut     cubic-bezier(0.77, 0, 0.175, 1)
  press          scale 0.97, 90ms ease.out
  enter          220ms ease.out, y 8px to 0, opacity 0 to 1
  exit           140ms ease.in, opacity 1 to 0
  spring.snap    { type: "spring", stiffness: 520, damping: 34, mass: 0.7 }
  spring.settle  { type: "spring", visualDuration: 0.45, bounce: 0.12 }
  spring.heavy   { type: "spring", stiffness: 220, damping: 26, mass: 1.3 }
  GSAP CustomEase "forge": "M0,0 C0.14,0 0.1,1 1,1"

Performance rules: transform, opacity, clip-path and SVG stroke only. Use LazyMotion with
domAnimation. Use gsap.context via useGSAP for cleanup. Target 60fps on a mid-range Android.

Reduced motion: every sequence has a reduced variant (150ms crossfade, no travel, no shake).
Honor the OS setting and the in-app override.

------------------------------------------------------------------------------------------------
## 9. SIGNATURE MOTION GRAPHICS (build each exactly)
------------------------------------------------------------------------------------------------

A. AWAKENING BOOT (first run only, 3.2s, tap to skip). GSAP timeline:
   1. Black ground. A 1px --frost-2 horizontal line draws from center to full width (600ms).
   2. The line splits into two and they travel apart vertically, revealing the T3 panel (500ms).
   3. The panel frame draws with DrawSVG, corner ticks snap in (300ms, stagger 40ms).
   4. ScrambleText resolves "SYSTEM INITIALIZING" then "A PLAYER HAS BEEN SELECTED."
   5. The step 1 form fields enter with a 30ms stagger.

B. QUEST IGNITE (every completion, under 300ms to done state). Motion:
   1. Pointer down: row press scale 0.985.
   2. Commit: the completion square fills bottom to top via clip-path in ember (180ms),
      the chamfer-square glyph appears.
   3. The label fades to --frost-2 while a 1px rule draws across it left to right (200ms).
   4. navigator.vibrate(10) when supported and enabled.

C. HEAT TRANSFER (runs after B, asynchronous so it never blocks input). GSAP MotionPath:
   A small "+10" Martian Mono chip spawns at the square and travels on a curved path to the
   CORE gauge in the app bar (520ms, forge ease). On arrival the next CORE cell ignites.
   If more than 3 completions land within 400ms, merge them into one chip ("+30").

D. CORE GAUGE. 24 segments with 2px gaps. A newly filled cell steps --ember-3 > --ember-2 >
   --ember in 3 discrete frames (150ms total). The leading cell flashes --core for 120ms then
   settles. The XP number rolls like an odometer: each digit column translates independently,
   spring.snap.

E. LEVEL UP: "THAW" (1.6s, auto-dismiss 4s, tap to skip). GSAP:
   1. An overlay at 92% --ink-0 fades in over 120ms.
   2. Seven fracture lines draw outward from center with DrawSVG (380ms, stagger 30ms).
   3. The overlay splits into shards along the fractures (clip-path polygons) that drift
      apart and fade (500ms), revealing the level panel.
   4. "LEVEL 04" in hero-num: SplitText chars rise from 40% with a 30ms stagger, and the digits
      ScrambleText into place.
   5. Stat deltas list in: "STRENGTH +1", "DISCIPLINE +1".
   6. The "Continue" button receives focus.

F. RANK UP: "FORGING" (4.5s, full screen, tap anywhere to jump to the end state). GSAP:
   1. Blackout, 250ms.
   2. The old rank plaque appears cold (glacier stroke), then fractures and falls away.
   3. 40 small square sparks (2 to 4px squares, never circles) rise with randomized drift.
   4. The new plaque outline draws (700ms), the fill heats through discrete steps, and the
      brass trim draws.
   5. SplitText title: "RANK D. KINDLED HUNTER."
   6. Behind the overlay, tween --temp to the new rank over 1.2s, so the whole UI is visibly
      warmer when the overlay leaves.

G. STREAK STATES:
   BURNING: count in Archivo numerals, angular flame glyph with a 3-step opacity flicker every
            2.4s (disabled in reduced motion).
   BANKED:  on a rest day, an SVG frost pattern mask fades over the counter (600ms),
            glacier color, label "BANKED".
   BROKEN:  a one-frame --fault flash, the digits drop 12px and blur out, then frost creeps
            across via an animated feTurbulence threshold (900ms). The count resets to 0.

H. DAY CLEARED SEAL (all 3 categories done). A square brass stamp "ARC DAY 12 CLEARED" lands
   with spring stiffness 700 damping 30, scale 1.4 to 1, rotate -4deg, and a 2px 120ms
   screen shake. Then the Sonner notice "[Gate Cleared] Day 12 complete. +105 XP."

I. PR SEAL. The exercise row gets a brass "PR" seal stamped at its right edge (spring.snap)
   plus the notice "[Notice] New record on Deadlift. 80 KG x 10. e1RM 106.7 KG."

J. PAGE TRANSITIONS. Motion AnimatePresence in the /app template. Direction follows nav order:
   moving right enters from x 16px, moving left from x -16px, 180ms ease.out, exit 120ms. The
   app bar and CORE gauge persist and never animate on navigation.

K. SHEETS AND NOTICES. Vaul sheets with velocity-based dismiss. Sonner notices top-center on
   mobile, top-right on desktop, max 3 visible, styled as small T2 panels with a Martian Mono
   tag. Notices are announced through aria-live="polite".

L. LOADING. Data is local, so most views render instantly. If data is not ready within 150ms,
   show a structural placeholder that matches the final layout block-for-block in --ink-2,
   with one slow 1.4s scanline sweep. Never show a spinner.

Ceremony queue: ceremonies never overlap. Order is notice > level up > rank up > day seal.
Rank up supersedes level up in the same event. Implement a queue in src/lib/ceremony.ts.

------------------------------------------------------------------------------------------------
## 10. GAME ENGINE (pure TypeScript, fully unit tested with Vitest)
------------------------------------------------------------------------------------------------

src/lib/engine/ contains pure functions with no React:
- XP table from spec 3.1. XP to next level = 100 x level. Rank every 10 levels:
  E(1-9) D(10-19) C(20-29) B(30-39) A(40-49) S(50+).
- Stats: STRENGTH +1 per 20 completed sets, STAMINA +1 per 3 cardio sessions, DISCIPLINE +1
  per full diet day, VITALITY from sleep logs once unlocked at level 5.
- Streaks: tracked separately for workout, diet and cardio. Rest days BANK the workout streak
  (neither increments nor breaks it). A missed mandatory day breaks it.
- 7-day full-completion streak: +200 XP and the Streak Shield trophy.
- PR detection: compare Epley e1RM = weight x (1 + reps / 30), never raw weight.
- Completion bonuses scale with exercise count so days are fair:
  workout bonus = 8 x exercises in that day.
- Every action returns an event list (xp_gained, level_up, rank_up, streak_changed, pr,
  trophy_unlocked) that drives notices and ceremonies. Undo replays the inverse.
Tests cover: level boundaries, rank boundaries, streak across weekends, undo symmetry,
PR false positives, date rollover at local midnight.

------------------------------------------------------------------------------------------------
## 11. DATA LAYER (local-first now, backend-ready)
------------------------------------------------------------------------------------------------

- Dexie (IndexedDB) for storage, Zustand for UI state, zod schemas for every entity.
- Keep PLAN and LOG separate. Plans are versioned: an edit creates a new version. Logs
  reference exercise and meal IDs plus the plan version, never names, so renames and swaps
  keep history intact.
- Entities: Profile, WorkoutPlan(version), Exercise(id, name, variants[], targetSets,
  targetReps, muscleRegion), DietPlan(version), Meal(id, time, name, items[], macros),
  DayLog(date, exerciseLogs[], mealLogs[], cardioLog, sleepLog), WeighIn, XpEvent,
  Trophy, Settings.
- Access everything through a Repository interface (src/lib/data/repo.ts) with a Dexie
  implementation, so a Supabase sync implementation can be added later without touching UI.
- Seed from the spec on first run. Export and import the whole database as versioned JSON.
- PWA with @serwist/next: installable, full offline, app icon drawn from the rank plaque.

------------------------------------------------------------------------------------------------
## 12. COPY VOICE
------------------------------------------------------------------------------------------------

System notices are short, declarative, in-universe. A bracketed tag in Martian Mono, then one
sentence. Examples:
  [Quest Complete] Pull Ups cleared. +10 XP.
  [Gate Cleared] Back Day complete. +50 XP.
  [Level Up] You have reached Level 4.
  [Rank Up] Rank D. The System acknowledges your growth.
  [Notice] New record on Squats. 90 KG x 12.
  [Warning] Diet streak at risk. 2 meals remain.
  [Streak Broken] Cardio streak reset. Begin again tomorrow.
  [Banked] Rest day. Workout streak preserved.
UI labels are uppercase Martian Mono. Body copy is plain, direct, second person. No filler.

------------------------------------------------------------------------------------------------
## 13. ACCESSIBILITY AND QUALITY BARS
------------------------------------------------------------------------------------------------

- WCAG 2.2 AA. Touch targets at least 44px (quest rows 64px). Visible focus everywhere.
  Full keyboard support. Screen reader labels on every icon button. Meters use role="meter"
  with aria-valuenow. Charts have a data table alternative.
- Lighthouse mobile: Performance 95+, Accessibility 100, Best Practices 100.
  LCP under 1.8s, CLS under 0.02, INP under 150ms.
- Responsive at 360, 390, 768, 1024 and 1440 widths. No horizontal page scroll.
- Both skins and all 6 rank temperatures verified.

------------------------------------------------------------------------------------------------
## 14. BUILD ORDER AND DEFINITION OF DONE
------------------------------------------------------------------------------------------------

Phase 1  Tokens, fonts, icons, rank plaques, slop-check script, contrast script.
Phase 2  Engine plus tests. Data layer, seed, repository.
Phase 3  App shell: app bar with CORE, bottom nav, left rail, transitions, notices, sheets,
         ceremony queue, command palette.
Phase 4  /app/quest complete with motions B, C, D, H, I.
Phase 5  /app/status, /app/log (all subpages), /app/progress (both tabs), /app/system,
         plan editors.
Phase 6  /awaken with boot sequence A. Ceremonies E and F. Streak states G.
Phase 7  Landing page with live demo and scroll sequences. Legal pages. 404, error, offline. PWA.
Phase 8  impeccable critique, audit, harden, polish. Taste pre-flight on every screen.
         ui-ux-pro-max pre-delivery checklist. Playwright tests that click every button on every
         route and assert no console errors. slop-check passes. Screenshots of every route at
         390 and 1440 in both skins.

Done means: every route renders; every button, form, sheet, shortcut and undo works; data
persists across reloads and works offline; slop-check, lint, type check, unit tests and
Playwright all pass; zero TODOs or placeholder copy remain.

------------------------------------------------------------------------------------------------
## BUILD NOTES (added during implementation)
------------------------------------------------------------------------------------------------

Decisions taken while building that a future session should not undo:

- **@serwist/next was not used.** It needs a webpack config, and Next 16 defaults to Turbopack.
  The offline shell is a hand-written service worker at public/sw.js (network-first for
  navigations, cache-first for hashed build output), per Next's own PWA guide.
- **Page transitions use React's <ViewTransition>**, not Motion's AnimatePresence. The App Router
  cannot run exit animations on route change; view transitions can. See src/lib/view-transition.ts
  for the types shim and globals.css for the nav-forward/nav-back rules.
- **Motion cannot interpolate CSS variables.** Anything tinted with a token (meters, the CORE
  gauge, swipe tints) uses a CSS transition or animates opacity instead. Motion silently
  no-ops on `animate={{ backgroundColor: "var(--x)" }}`.
- **Keyboard actions never animate** (Emil's rule): Space-to-clear and Cmd+K apply state
  instantly; pointer taps get the full ignite.
- **GSAP is never in the first load.** SystemWindow and heat-transfer import it dynamically, and
  the ceremonies, boot sequence, charts and landing scroll sections are next/dynamic. This took
  the landing page from 5.3s LCP to 2.6s on throttled mobile.
- **The landing demo rotates the training split onto today** (see demo-seed.ts). Without it the
  demo renders an empty "Rest day" every weekend, with nothing for a visitor to tap.
- **Onboarding starts empty, and every Hunter sets up with their own details.** It used to open
  pre-filled with one person's name, body, schedule and diet, so pressing Next produced their plan
  for someone else. Now nothing is pre-filled except the name Google supplies; sex, age, body,
  schedule, rest days, experience, equipment, diet and whey must be answered, and skipping the
  scan is an explicit choice. The order is answers, then the System's message, then the issued
  plan, then Use this plan. Profiles carry `setupVersion`; anything below `SETUP_VERSION` is sent
  back through onboarding from the name, keeping its arc and logged days. The draft is stored per
  account and cleared on sign out, and a local arc is only adopted into an account if it was set up
  under this flow.
- **Every weekday has its own meals.** `DietPlan.days` holds a list per weekday and `meals` is the
  fallback, so plans made before it still work. Read meals through `mealsFor(plan, date)`, never
  `plan.meals`: Quest, Log, meal toggling and diet completion all do. The diet editor edits one
  day at a time, and a shared plan can be split into per-day lists from there.
- **Plans are generated from the targets.** Food and exercise libraries live in
  src/lib/plan/library; onboarding and System, Targets build a meal plan, a training week and
  a supplies list from them, show a preview, and install on confirm. Onboarding writes version 1;
  System writes a new version so logged days keep theirs. See ml/README.md for the accuracy
  numbers and the ranking rules.
- **Targets come from the plan model, inside a cage.** Onboarding no longer asks for BMR or a
  calorie target: it asks sex, age, experience, equipment, injuries and health conditions, and
  shows what the System calculated with an override. Out-of-range profiles fall back to the
  formula, clamps run in code after the model, carbs are derived so macros add up, and refusal
  conditions get no numbers at all. The readout always says TRAINED MODEL or FORMULA. Existing
  Hunters get the same calculation in System, Targets, with Apply. See ml/README.md.
- **`m.*` components need a LazyMotion ancestor or they render invisible.** Without one they stay
  at `initial`, and for SystemWindow that is opacity 0: the page is present, focusable and
  readable by a screen reader, and completely blank on screen. AppShell and LiveDemo each provide
  one; anything outside /app must wrap itself in `MotionScope`. This cost an hour on /auth.
- **With accounts on, nothing past the landing page opens signed out.** proxy.ts redirects /app
  and /awaken to /auth?next=, and sends a signed-in visitor on /auth to their quest; GameProvider
  catches a session that ends while a page is open. The landing page and legal pages stay public.
  Local-only Dexie mode still exists for builds without Supabase env, and for the end-to-end suite,
  which runs its own server on :3100 with NEXT_PUBLIC_ARISE_LOCAL_ONLY=1 and a separate build
  folder so it never creates real accounts. e2e/auth-gate.spec.ts checks the gate against the dev
  server on :3000 without signing in.
- **The arc has no end date.** `arcLength` is nullable and null by default, so the header reads
  ARC DAY 412 rather than DAY 412 OF 90, and stored 90s migrate to null on load (the value was
  hardcoded in onboarding and never editable, so every stored 90 is the old default). The brief's
  90 day framing is kept as a milestone, not a finish line.
- **XP is balanced for years, not a season.** Ranks still top out at S, but levels continue past
  it, and the shield is where sustained consistency pays: worth 200 XP at a fresh streak, rising
  by half again every 30 days to a 4x cap at 180. Nothing is ever clawed back for a missed day.
  Breaking a long run costs the multiplier, not the work already banked, because deleting past
  effort to punish an illness would be the wrong trade. Streak milestones run to 730 days, and
  nine badges now sit past the ninety day mark.
- **Cardio belongs to the workout, not to the day.** It used to be its own quest panel on every
  day including rest days. It now sits inside the Workout panel after the lifts, and rest days
  carry none: the bonus quest there already offers abs or cardio for anyone who wants it. The
  workout gate counts lifts plus cardio, `cardioMandatory` gates clearing, and the cardio streak
  banks on rest days exactly like the workout streak it now travels with.
- **Recovery is sealed, not hidden.** It used to render only at level 5 and up, so while Status
  said VITALITY grows from logged sleep there was nowhere to log any. The panel is now always
  present: a padlock instead of the count, the reason and the levels remaining on the row, and the
  real steppers shown inert underneath. A control you can see is a goal; a control that is absent
  is a missing feature.
- **The calorie target is a training-day number.** Rest days drop the Calories meter entirely
  (protein, carbs and fat keep their targets) and say so, rather than showing a ceiling that does
  not apply on a day with no session. Meals still count and still earn diet XP: a rest day is not
  a day off from the diet. Status and Awaken label the figure TRAINING DAY INTAKE / DEFICIT so the
  two agree. `DayResult.isRest` carries this; `workoutMandatory` could not, since it is also false
  on a training day whose plan is empty.
- **The command palette needs a tap target, not only a shortcut.** The CMD K button was
  `lg:` only, so on a phone -- which has no Cmd key either -- there was no way to open the palette
  at all. The button now shows at every width and drops the "CMD K" label below `lg`, so the hint
  only appears where the shortcut exists.
- **The scale is scored on direction, not on logging.** The brief's flat 20 XP weigh-in rewarded
  stepping on the scale and ignored what it said, so a gain cost nothing. The 20 still pays for
  the week's first reading, and on top of it every reading scores 30 XP per kg toward the target
  and -30 per kg away from it (0.2 kg deadband for scale noise, capped at +/-90 so a mistyped
  number cannot wipe an arc). Direction comes from the profile, so a bulk reverses the sign.
  Because each reading is measured against the last one *logged*, skipping a bad week defers the
  charge rather than dodging it. Total XP has a floor of zero: it is a record of work done, not a
  debt, which does mean an arc with nothing banked has nothing to lose.
- **The weigh-in sheet's XP preview runs the real derivation** rather than re-implementing the
  rules, so the number shown before logging and the notice after it can never disagree.
- **"Trophies" is called Badges everywhere in code.** The brief's `/app/progress/trophies/[id]`
  is `/app/progress/badges/[id]`, the tab reads BADGES, and the event is `badge_unlocked`. The
  wall already called them badges (spec s.7), so the two names were one thing wearing two labels.
- **Every badge has its own glyph** (src/components/system/Badge.tsx). They share the hexagonal
  plaque so the wall reads as one system, but the mark inside is drawn for the specific thing
  earned: the three streak shields tier by chevron count, records-10 stacks bars, and so on.
  Rank badges delegate to RankPlaque and keep their letter.
- **Contrast tokens are load-bearing.** scripts/contrast.ts parses globals.css directly; several
  brief values were nudged to clear WCAG AA and must not be reverted to the original hexes.

Verification commands: `npm run slop-check`, `npm run contrast`, `npm test`,
`npx playwright test` (e2e + axe accessibility), `npm run build`.
