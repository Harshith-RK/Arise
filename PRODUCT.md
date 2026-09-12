# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: Harshith RK, the "Hunter". He is running a 90-day Winter Arc starting in October to
rebuild strength and cut fat after months off. He opens the app daily, mostly on a phone at the
gym between 7:00 and 9:00 PM, between sets, often one-handed with sweaty hands and a poor
connection. He also checks it on desktop to review progress and edit his plan.

## Product Purpose

A gamified fitness and diet tracker styled as the System from Solo Leveling. Every completed
exercise, meal and cardio session feeds a level, XP and stat system so daily consistency feels
like progress in a game. Success means he logs every scheduled day for the whole arc, can see
his weight, body composition and lifts trend over time, and trusts the numbers he sees.

## Positioning

The System turns his exact, personal plan (a fixed Monday to Friday split and a seven-meal
vegetarian plan) into daily quests with real consequences: streaks, penalties, ranks and
records. Generic trackers log workouts; this one runs his arc.

## Operating Context

- Daily: open Daily Quest, tick exercises set by set with the weight used, mark meals eaten,
  log cardio (200 kcal default). Between sets there is a rest timer.
- Weekly: weigh-in with InBody-style readings (weight, body fat, skeletal muscle, visceral fat).
- Occasionally: swap an exercise variant or a meal, edit the plan, export a backup.
- Weekends are rest days with optional bonus quests that never break streaks.

## Capabilities and Constraints

- Local-first. All data lives on the device (IndexedDB) and must work fully offline and persist
  for months. A Supabase sync backend comes later behind a repository interface.
- Plan data (workout and diet templates) is versioned and separate from daily logs, so editing
  the plan never loses history.
- Game rules come from docs/spec.md section 3 with the corrections in docs/frontend-brief.md
  section 10 (Epley e1RM for PRs, rest days bank streaks, workout bonus scales with exercise
  count, VITALITY unlocks at level 5).
- Stack: Next.js 16 App Router, React 19, Tailwind v4, TypeScript, Motion 13, GSAP 3.15.
- Out of scope: social features, leaderboards, barcode scanning, wearables.

## Brand Commitments

- Name: Winter Arc. In-product voice: the System. Short, declarative, in-universe notices with a
  bracketed tag, for example "[Quest Complete] Pull Ups cleared. +10 XP."
- Solo Leveling vocabulary (Hunter, Rank E to S, Gate, Quest, Penalty, Awakening) in copy only.
- The binding visual direction, bans and motion specs live in docs/frontend-brief.md.

## Evidence on Hand

- Real seed data: profile (175.5 cm, 95.5 kg start, 72.7 kg target, 35.3% body fat, 34.9 kg
  skeletal muscle, visceral fat 14, BMR 1705 kcal), the five-day workout split and the
  seven-meal diet plan with macros, all in docs/spec.md sections 2, 5 and 6.
- No testimonials, users, press or pricing exist. Never invent any.

## Product Principles

1. The gym-floor moment comes first: logging a set must be one thumb tap, even offline.
2. The numbers must be trustworthy. Undo everything, never lose history, never fake a record.
3. Rewards are earned, and the System says so plainly. No generic praise.
4. Every plan detail is his to edit. The seed is a starting snapshot, not a constant.

## Accessibility & Inclusion

WCAG 2.2 AA. Touch targets at least 44px (quest rows 64px). Full keyboard support on desktop.
Every ceremony honors reduced motion.
