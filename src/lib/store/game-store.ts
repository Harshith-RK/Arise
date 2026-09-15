import { createStore, type StoreApi } from "zustand/vanilla";
import { deriveProgress, type Progress } from "@/lib/engine/derive";
import { diffProgress, type SystemEvent } from "@/lib/engine/events";
import { todayKey, weekStart } from "@/lib/engine/dates";
import { makePlanLookup, mealsFor, trainingDayFor } from "@/lib/engine/day";
import type {
  DayKey,
  DayLog,
  DietPlan,
  ExerciseLog,
  Macros,
  MealLog,
  Profile,
  SetLog,
  Settings,
  Snapshot,
  Supplies,
  WeighIn,
  WorkoutPlan,
} from "@/lib/engine/types";
import { isSetUp } from "@/lib/engine/types";
import { DEFAULT_SETTINGS, seedDietPlan, seedSupplies, seedWorkoutPlan } from "@/lib/data/seed";
import { toExportFile, type ExportFile, type Repository } from "@/lib/data/repo";

/* ==========================================================================
   Game store. Holds the snapshot, derives progress after every write, and
   returns an Outcome (events + notice + precise undo) to the caller.
   ========================================================================== */

export type NoticeTone = "ember" | "glacier" | "brass" | "fault" | "neutral";
export type Notice = { tag: string; text: string; tone: NoticeTone };

export type Outcome = {
  events: SystemEvent[];
  notice: Notice | null;
  undo: (() => Promise<void>) | null;
};

const NONE: Outcome = { events: [], notice: null, undo: null };

export type GameStatus = "loading" | "onboarding" | "ready" | "error";

export type GameState = {
  status: GameStatus;
  error: string | null;
  today: string;
  snapshot: Snapshot | null;
  progress: Progress | null;
  repoKind: Repository["kind"];

  init(): Promise<void>;
  /** Re-read from the repository without seeding. Used by realtime. */
  reload(): Promise<void>;
  setToday(key: string): void;

  /* quests */
  logSet(date: string, exerciseId: string, index: number, patch: Partial<SetLog>): Promise<Outcome>;
  completeExercise(date: string, exerciseId: string, weight: number | null, reps: number | null): Promise<Outcome>;
  reopenExercise(date: string, exerciseId: string): Promise<Outcome>;
  setVariant(date: string, exerciseId: string, variantId: string): Promise<Outcome>;
  toggleMeal(date: string, mealId: string): Promise<Outcome>;
  setMealOverride(date: string, mealId: string, macros: Macros | null): Promise<Outcome>;
  toggleCardio(date: string): Promise<Outcome>;
  setCardioDetails(date: string, kcal: number, minutes: number | null): Promise<Outcome>;
  toggleBonus(date: string): Promise<Outcome>;
  setSleep(date: string, hours: number | null, waterL: number | null): Promise<Outcome>;

  /* body */
  logWeighIn(w: WeighIn): Promise<Outcome>;
  deleteWeighIn(date: string): Promise<Outcome>;

  /* profile, settings, plans */
  /**
   * `plans`, when given, replace the starter plans. Safe only at onboarding:
   * no day has been logged against the version they overwrite.
   */
  completeOnboarding(
    profile: Profile,
    plans?: {
      workout: Omit<WorkoutPlan, "version" | "createdAt">;
      diet: Omit<DietPlan, "version" | "createdAt">;
      supplies: Supplies["items"];
    },
  ): Promise<void>;
  saveProfile(p: Profile): Promise<Outcome>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
  saveWorkoutPlan(next: Omit<WorkoutPlan, "version" | "createdAt">): Promise<Outcome>;
  /**
   * Overwrite the current workout version in place. Unlike saveWorkoutPlan this
   * reaches every day already logged on that version, which is the point when a
   * Hunter is correcting a mistake, and the reason the editor says so.
   */
  updateWorkoutPlan(next: Omit<WorkoutPlan, "version" | "createdAt">): Promise<Outcome>;
  saveDietPlan(next: Omit<DietPlan, "version" | "createdAt">): Promise<Outcome>;
  reorderDay(day: DayKey, exerciseIds: string[]): Promise<void>;

  /* supplies */
  saveSupplies(s: Supplies): Promise<void>;

  /* data */
  exportData(): ExportFile | null;
  importData(s: Snapshot): Promise<void>;
  resetArc(): Promise<void>;
};

export type GameStore = StoreApi<GameState>;

type SubKey =
  | { kind: "exercise"; id: string }
  | { kind: "meal"; id: string }
  | { kind: "cardio" }
  | { kind: "bonus" }
  | { kind: "sleep" };

function readSub(log: DayLog | undefined, k: SubKey): unknown {
  if (!log) return undefined;
  switch (k.kind) {
    case "exercise":
      return log.exercises[k.id];
    case "meal":
      return log.meals[k.id];
    case "cardio":
      return log.cardio;
    case "bonus":
      return log.bonus;
    case "sleep":
      return log.sleep;
  }
}

function writeSub(log: DayLog, k: SubKey, value: unknown) {
  switch (k.kind) {
    case "exercise":
      if (value === undefined) delete log.exercises[k.id];
      else log.exercises[k.id] = value as ExerciseLog;
      break;
    case "meal":
      if (value === undefined) delete log.meals[k.id];
      else log.meals[k.id] = value as MealLog;
      break;
    case "cardio":
      log.cardio = (value as DayLog["cardio"]) ?? { done: false, kcal: 200, minutes: null };
      break;
    case "bonus":
      log.bonus = (value as DayLog["bonus"]) ?? { done: false };
      break;
    case "sleep":
      log.sleep = (value as DayLog["sleep"]) ?? null;
      break;
  }
}

export type StoreOptions = {
  now?: () => Date;
  /** Used by the sandbox demo to start with a prepared snapshot. */
  seed?: () => Snapshot;
  onPersistError?: (e: unknown) => void;
  /** Mirror settings/rank into the document (off for the sandbox). */
  onSettings?: (s: Settings) => void;
};

export function createGameStore(repo: Repository, opts: StoreOptions = {}): GameStore {
  const now = opts.now ?? (() => new Date());

  return createStore<GameState>((set, get) => {
    const derive = (snap: Snapshot, today = get().today) => deriveProgress(snap, today);

    function latest<T extends { version: number }>(list: T[]): T {
      return list.reduce((a, b) => (b.version > a.version ? b : a));
    }

    function newLog(date: string, snap: Snapshot): DayLog {
      return {
        date,
        workoutPlanVersion: latest(snap.workoutPlans).version,
        dietPlanVersion: latest(snap.dietPlans).version,
        exercises: {},
        meals: {},
        cardio: { done: false, kcal: 200, minutes: null },
        bonus: { done: false },
        sleep: null,
        updatedAt: now().toISOString(),
      };
    }

    async function persist<T>(fn: () => Promise<T>) {
      try {
        return await fn();
      } catch (e) {
        opts.onPersistError?.(e);
        throw e;
      }
    }

    /** Commit a new snapshot: persist, derive, diff. */
    function commit(next: Snapshot, date: string): { events: SystemEvent[]; after: Progress } {
      const before = get().progress;
      const after = derive(next);
      set({ snapshot: next, progress: after });
      return { events: before ? diffProgress(before, after, date) : [], after };
    }

    /**
     * Mutate one sub-record of a day log. Undo restores exactly that
     * sub-record on the *current* log, so later edits survive.
     */
    async function mutateDay(
      date: string,
      key: SubKey,
      mutate: (log: DayLog, snap: Snapshot) => void,
      describe: (ctx: { events: SystemEvent[]; log: DayLog; before: DayLog | undefined; after: Progress }) => Notice | null,
    ): Promise<Outcome> {
      const snap = get().snapshot;
      if (!snap) return NONE;
      const existing = snap.dayLogs.find((l) => l.date === date);
      const prevSub = structuredClone(readSub(existing, key));
      const log = existing ? structuredClone(existing) : newLog(date, snap);
      mutate(log, snap);
      log.updatedAt = now().toISOString();

      const next: Snapshot = { ...snap, dayLogs: [...snap.dayLogs.filter((l) => l.date !== date), log] };
      await persist(() => repo.saveDayLog(log));
      const { events, after } = commit(next, date);

      const undo = async () => {
        const cur = get().snapshot;
        if (!cur) return;
        const curLog = cur.dayLogs.find((l) => l.date === date);
        if (!curLog) return;
        const restored = structuredClone(curLog);
        writeSub(restored, key, structuredClone(prevSub));
        restored.updatedAt = now().toISOString();
        await persist(() => repo.saveDayLog(restored));
        commit({ ...cur, dayLogs: [...cur.dayLogs.filter((l) => l.date !== date), restored] }, date);
      };

      return { events, notice: describe({ events, log, before: existing, after }), undo };
    }

    const xpOf = (events: SystemEvent[]) =>
      events.reduce((s, e) => (e.type === "xp" ? s + e.amount : s), 0);
    const xpText = (n: number) => (n > 0 ? ` +${n} XP.` : n < 0 ? ` ${n} XP.` : "");

    function exerciseName(snap: Snapshot, log: DayLog, exerciseId: string): string {
      const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
      const def = plans.workout(log.workoutPlanVersion).exercises[exerciseId] ?? latest(snap.workoutPlans).exercises[exerciseId];
      const vId = log.exercises[exerciseId]?.variantId;
      return def?.variants.find((v) => v.id === vId)?.name ?? def?.variants[0].name ?? "Exercise";
    }

    function ensureExercise(log: DayLog, snap: Snapshot, exerciseId: string): ExerciseLog {
      const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
      const def = plans.workout(log.workoutPlanVersion).exercises[exerciseId] ?? latest(snap.workoutPlans).exercises[exerciseId];
      const ex = log.exercises[exerciseId] ?? { variantId: def.variants[0].id, sets: [] };
      const variant = def.variants.find((v) => v.id === ex.variantId) ?? def.variants[0];
      while (ex.sets.length < def.targetSets) ex.sets.push({ done: false, weight: null, reps: variant.repsMin });
      log.exercises[exerciseId] = ex;
      return ex;
    }

    return {
      status: "loading",
      error: null,
      today: todayKey(now()),
      snapshot: null,
      progress: null,
      repoKind: repo.kind,

      /**
       * A change arrived from another device. Everything is derived from the
       * log in one pass, so pulling the whole snapshot is both simplest and
       * incapable of drifting the way patching row by row would.
       */
      async reload() {
        try {
          const snap = await repo.load();
          if (!snap) return;
          opts.onSettings?.(snap.settings);
          set({
            snapshot: snap,
            progress: derive(snap),
            status: isSetUp(snap.profile) ? "ready" : "onboarding",
            error: null,
          });
        } catch {
          // A failed background pull leaves what is on screen alone. The next
          // change, or the next launch, tries again.
        }
      },

      async init() {
        try {
          let snap = await repo.load();
          if (!snap) {
            const today = todayKey(now());
            snap = opts.seed?.() ?? {
              profile: null,
              settings: DEFAULT_SETTINGS,
              workoutPlans: [seedWorkoutPlan()],
              dietPlans: [seedDietPlan()],
              dayLogs: [],
              weighIns: [],
              supplies: seedSupplies(today),
            };
            await repo.replaceAll(snap);
          }
          // Supplies roll over each ISO week.
          const wk = weekStart(get().today);
          if (snap.supplies.weekOf !== wk) {
            snap = { ...snap, supplies: { weekOf: wk, items: snap.supplies.items.map((i) => ({ ...i, checked: false })) } };
            await repo.saveSupplies(snap.supplies);
          }
          opts.onSettings?.(snap.settings);
          set({
            snapshot: snap,
            progress: derive(snap),
            status: isSetUp(snap.profile) ? "ready" : "onboarding",
            error: null,
          });
        } catch (e) {
          set({ status: "error", error: e instanceof Error ? e.message : "The log could not be read." });
        }
      },

      setToday(key) {
        if (key === get().today) return;
        const snap = get().snapshot;
        set({ today: key, progress: snap ? deriveProgress(snap, key) : null });
      },

      /* ---------------- quests ---------------- */

      logSet(date, exerciseId, index, patch) {
        return mutateDay(
          date,
          { kind: "exercise", id: exerciseId },
          (log, snap) => {
            const ex = ensureExercise(log, snap, exerciseId);
            ex.sets[index] = { ...ex.sets[index], ...patch };
          },
          ({ events, log, before }) => {
            const snap = get().snapshot!;
            const wasDone = (before?.exercises[exerciseId]?.sets.filter((s) => s.done).length ?? 0) >= (log.exercises[exerciseId]?.sets.length ?? 99);
            const nowDone = log.exercises[exerciseId]?.sets.every((s) => s.done);
            if (nowDone && !wasDone) return questNotice(events, exerciseName(snap, log, exerciseId), "cleared", date);
            return null;
          },
        );
      },

      completeExercise(date, exerciseId, weight, reps) {
        return mutateDay(
          date,
          { kind: "exercise", id: exerciseId },
          (log, snap) => {
            const ex = ensureExercise(log, snap, exerciseId);
            ex.sets = ex.sets.map((s) => (s.done ? s : { done: true, weight: s.weight ?? weight, reps: s.reps ?? reps }));
          },
          ({ events, log }) => questNotice(events, exerciseName(get().snapshot!, log, exerciseId), "cleared", date),
        );
      },

      reopenExercise(date, exerciseId) {
        return mutateDay(
          date,
          { kind: "exercise", id: exerciseId },
          (log, snap) => {
            const ex = ensureExercise(log, snap, exerciseId);
            ex.sets = ex.sets.map((s) => ({ ...s, done: false }));
          },
          ({ events, log }) => ({
            tag: "Rollback",
            text: `${exerciseName(get().snapshot!, log, exerciseId)} reopened.${xpText(xpOf(events))}`,
            tone: "neutral",
          }),
        );
      },

      setVariant(date, exerciseId, variantId) {
        return mutateDay(
          date,
          { kind: "exercise", id: exerciseId },
          (log, snap) => {
            const ex = ensureExercise(log, snap, exerciseId);
            ex.variantId = variantId;
          },
          ({ log }) => ({ tag: "Notice", text: `Variant set to ${exerciseName(get().snapshot!, log, exerciseId)}.`, tone: "neutral" }),
        );
      },

      toggleMeal(date, mealId) {
        return mutateDay(
          date,
          { kind: "meal", id: mealId },
          (log) => {
            const m = log.meals[mealId] ?? { eaten: false, override: null };
            log.meals[mealId] = { ...m, eaten: !m.eaten };
          },
          ({ events, log }) => {
            const snap = get().snapshot!;
            const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
            const meal = mealsFor(plans.diet(log.dietPlanVersion), log.date).find((m) => m.id === mealId);
            const name = meal?.name ?? "Meal";
            if (!log.meals[mealId]?.eaten) return { tag: "Rollback", text: `${name} unmarked.${xpText(xpOf(events))}`, tone: "neutral" };
            const dietCleared = events.some((e) => e.type === "xp") && isDietComplete(snap, log);
            return dietCleared
              ? { tag: "Quest Complete", text: `Every meal eaten.${xpText(xpOf(events))}`, tone: "ember" }
              : { tag: "Quest Complete", text: `${name} eaten.${xpText(xpOf(events))}`, tone: "ember" };
          },
        );
      },

      setMealOverride(date, mealId, macros) {
        return mutateDay(
          date,
          { kind: "meal", id: mealId },
          (log) => {
            const m = log.meals[mealId] ?? { eaten: false, override: null };
            log.meals[mealId] = { ...m, override: macros };
          },
          () => ({ tag: "Notice", text: macros ? "Macros overridden for today." : "Planned macros restored.", tone: "neutral" }),
        );
      },

      toggleCardio(date) {
        return mutateDay(
          date,
          { kind: "cardio" },
          (log) => {
            log.cardio = { ...log.cardio, done: !log.cardio.done };
          },
          ({ events, log }) =>
            log.cardio.done
              ? { tag: "Quest Complete", text: `Cardio logged. ${log.cardio.kcal} KCAL.${xpText(xpOf(events))}`, tone: "ember" }
              : { tag: "Rollback", text: `Cardio unmarked.${xpText(xpOf(events))}`, tone: "neutral" },
        );
      },

      setCardioDetails(date, kcal, minutes) {
        return mutateDay(
          date,
          { kind: "cardio" },
          (log) => {
            log.cardio = { ...log.cardio, kcal, minutes };
          },
          () => null,
        );
      },

      toggleBonus(date) {
        return mutateDay(
          date,
          { kind: "bonus" },
          (log) => {
            log.bonus = { done: !log.bonus.done };
          },
          ({ events, log }) =>
            log.bonus.done
              ? { tag: "Bonus Quest", text: `Rest day work logged.${xpText(xpOf(events))}`, tone: "ember" }
              : { tag: "Rollback", text: `Bonus quest unmarked.${xpText(xpOf(events))}`, tone: "neutral" },
        );
      },

      setSleep(date, hours, waterL) {
        return mutateDay(
          date,
          { kind: "sleep" },
          (log) => {
            log.sleep = { hours, waterL };
          },
          ({ events }) => ({ tag: "Recovery", text: `Sleep and water logged.${xpText(xpOf(events))}`, tone: "glacier" }),
        );
      },

      /* ---------------- body ---------------- */

      async logWeighIn(w) {
        const snap = get().snapshot;
        if (!snap) return NONE;
        const prev = snap.weighIns.find((x) => x.date === w.date);
        await persist(() => repo.saveWeighIn(w));
        const { events } = commit({ ...snap, weighIns: [...snap.weighIns.filter((x) => x.date !== w.date), w] }, w.date);
        const undo = async () => {
          const cur = get().snapshot!;
          if (prev) await repo.saveWeighIn(prev);
          else await repo.deleteWeighIn(w.date);
          const list = cur.weighIns.filter((x) => x.date !== w.date);
          commit({ ...cur, weighIns: prev ? [...list, prev] : list }, w.date);
        };
        // A gain reads as a penalty, not a neutral reading. The System does not
        // pretend the number went the right way.
        const net = xpOf(events);
        return {
          events,
          notice:
            net < 0
              ? { tag: "Penalty", text: `Weigh-in logged. ${w.weightKg.toFixed(1)} KG. The scale moved the wrong way.${xpText(net)}`, tone: "fault" }
              : { tag: "Calibration", text: `Weigh-in logged. ${w.weightKg.toFixed(1)} KG.${xpText(net)}`, tone: "glacier" },
          undo,
        };
      },

      async deleteWeighIn(date) {
        const snap = get().snapshot;
        if (!snap) return NONE;
        const prev = snap.weighIns.find((x) => x.date === date);
        if (!prev) return NONE;
        await persist(() => repo.deleteWeighIn(date));
        const { events } = commit({ ...snap, weighIns: snap.weighIns.filter((x) => x.date !== date) }, date);
        return {
          events,
          notice: { tag: "Rollback", text: `Weigh-in removed.${xpText(xpOf(events))}`, tone: "neutral" },
          undo: async () => {
            const cur = get().snapshot!;
            await repo.saveWeighIn(prev);
            commit({ ...cur, weighIns: [...cur.weighIns, prev] }, date);
          },
        };
      },

      /* ---------------- profile, settings, plans ---------------- */

      async completeOnboarding(profile, plans) {
        const snap = get().snapshot;
        if (!snap) return;
        let next: Snapshot = { ...snap, profile };
        if (plans) {
          const createdAt = now().toISOString();
          const supplies: Supplies = { weekOf: weekStart(get().today), items: plans.supplies };
          await persist(() => repo.saveSupplies(supplies));
          if (!snap.dayLogs.length) {
            // A new Hunter: nothing refers to the starter plans, so replace them.
            const workout: WorkoutPlan = { ...plans.workout, version: 1, createdAt };
            const diet: DietPlan = { ...plans.diet, version: 1, createdAt };
            await persist(() => repo.saveWorkoutPlan(workout));
            await persist(() => repo.saveDietPlan(diet));
            next = { ...next, workoutPlans: [workout], dietPlans: [diet], supplies };
          } else {
            // Setting up again over an existing arc: the new plans become the
            // next versions, and only today onward moves to them. Logged days
            // keep the plan they were logged against.
            const workout: WorkoutPlan = { ...plans.workout, version: latest(snap.workoutPlans).version + 1, createdAt };
            const diet: DietPlan = { ...plans.diet, version: latest(snap.dietPlans).version + 1, createdAt };
            await persist(() => repo.saveWorkoutPlan(workout));
            await persist(() => repo.saveDietPlan(diet));
            const today = get().today;
            const dayLogs = await Promise.all(
              snap.dayLogs.map(async (l) => {
                if (l.date < today) return l;
                const moved = { ...l, workoutPlanVersion: workout.version, dietPlanVersion: diet.version };
                await persist(() => repo.saveDayLog(moved));
                return moved;
              }),
            );
            next = {
              ...next,
              workoutPlans: [...snap.workoutPlans, workout],
              dietPlans: [...snap.dietPlans, diet],
              dayLogs,
              supplies,
            };
          }
        }
        await persist(() => repo.saveProfile(profile));
        set({ snapshot: next, progress: derive(next), status: "ready" });
      },

      async saveProfile(p) {
        const snap = get().snapshot;
        if (!snap) return NONE;
        const prev = snap.profile;
        await persist(() => repo.saveProfile(p));
        const { events } = commit({ ...snap, profile: p }, get().today);
        return {
          events,
          notice: { tag: "Notice", text: "Hunter profile updated.", tone: "neutral" },
          undo: prev
            ? async () => {
                await repo.saveProfile(prev);
                commit({ ...get().snapshot!, profile: prev }, get().today);
              }
            : null,
        };
      },

      async saveSettings(patch) {
        const snap = get().snapshot;
        if (!snap) return;
        const settings = { ...snap.settings, ...patch };
        await persist(() => repo.saveSettings(settings));
        set({ snapshot: { ...snap, settings } });
        opts.onSettings?.(settings);
      },

      async saveWorkoutPlan(next) {
        const snap = get().snapshot;
        if (!snap) return NONE;
        const version = latest(snap.workoutPlans).version + 1;
        const plan: WorkoutPlan = { ...next, version, createdAt: now().toISOString() };
        await persist(() => repo.saveWorkoutPlan(plan));
        // Today's in-progress log adopts the new version; history keeps its own.
        const today = get().today;
        const logs = await Promise.all(
          snap.dayLogs.map(async (l) => {
            if (l.date < today) return l;
            const moved = { ...l, workoutPlanVersion: version };
            await repo.saveDayLog(moved);
            return moved;
          }),
        );
        const { events } = commit({ ...snap, workoutPlans: [...snap.workoutPlans, plan], dayLogs: logs }, today);
        return { events, notice: { tag: "Plan Updated", text: `Workout plan saved as version ${version}. History kept.`, tone: "neutral" }, undo: null };
      },

      async updateWorkoutPlan(next) {
        const snap = get().snapshot;
        if (!snap) return NONE;
        const current = latest(snap.workoutPlans);
        const plan: WorkoutPlan = { ...next, version: current.version, createdAt: current.createdAt };
        await persist(() => repo.saveWorkoutPlan(plan));
        const swap = (list: WorkoutPlan[], p: WorkoutPlan) => list.map((x) => (x.version === p.version ? p : x));
        const { events } = commit({ ...snap, workoutPlans: swap(snap.workoutPlans, plan) }, get().today);
        return {
          events,
          notice: { tag: "Plan Updated", text: `Workout plan version ${current.version} updated.`, tone: "neutral" },
          undo: async () => {
            await repo.saveWorkoutPlan(current);
            const cur = get().snapshot!;
            commit({ ...cur, workoutPlans: swap(cur.workoutPlans, current) }, get().today);
          },
        };
      },

      async saveDietPlan(next) {
        const snap = get().snapshot;
        if (!snap) return NONE;
        const version = latest(snap.dietPlans).version + 1;
        const plan: DietPlan = { ...next, version, createdAt: now().toISOString() };
        await persist(() => repo.saveDietPlan(plan));
        const today = get().today;
        const logs = await Promise.all(
          snap.dayLogs.map(async (l) => {
            if (l.date < today) return l;
            const moved = { ...l, dietPlanVersion: version };
            await repo.saveDayLog(moved);
            return moved;
          }),
        );
        const { events } = commit({ ...snap, dietPlans: [...snap.dietPlans, plan], dayLogs: logs }, today);
        return { events, notice: { tag: "Plan Updated", text: `Diet plan saved as version ${version}. History kept.`, tone: "neutral" }, undo: null };
      },

      async reorderDay(day, exerciseIds) {
        const snap = get().snapshot;
        if (!snap) return;
        const cur = latest(snap.workoutPlans);
        if (cur.days[day].exerciseIds.join() === exerciseIds.join()) return;
        // Reordering is cosmetic; it updates the current version in place.
        const plan: WorkoutPlan = { ...cur, days: { ...cur.days, [day]: { ...cur.days[day], exerciseIds } } };
        await persist(() => repo.saveWorkoutPlan(plan));
        const next = { ...snap, workoutPlans: snap.workoutPlans.map((p) => (p.version === plan.version ? plan : p)) };
        set({ snapshot: next, progress: derive(next) });
      },

      async saveSupplies(s) {
        const snap = get().snapshot;
        if (!snap) return;
        await persist(() => repo.saveSupplies(s));
        set({ snapshot: { ...snap, supplies: s } });
      },

      /* ---------------- data ---------------- */

      exportData() {
        const snap = get().snapshot;
        return snap ? toExportFile(snap, now()) : null;
      },

      async importData(s) {
        await persist(() => repo.replaceAll(s));
        opts.onSettings?.(s.settings);
        set({ snapshot: s, progress: derive(s), status: isSetUp(s.profile) ? "ready" : "onboarding" });
      },

      async resetArc() {
        const snap = get().snapshot;
        const today = get().today;
        const fresh: Snapshot = {
          profile: null,
          settings: snap?.settings ?? DEFAULT_SETTINGS,
          workoutPlans: [seedWorkoutPlan()],
          dietPlans: [seedDietPlan()],
          dayLogs: [],
          weighIns: [],
          supplies: seedSupplies(today),
        };
        await persist(() => repo.replaceAll(fresh));
        set({ snapshot: fresh, progress: derive(fresh), status: "onboarding" });
      },
    };

    function isDietComplete(snap: Snapshot, log: DayLog): boolean {
      const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
      return mealsFor(plans.diet(log.dietPlanVersion), log.date).every((m) => log.meals[m.id]?.eaten);
    }

    function questNotice(events: SystemEvent[], name: string, verb: string, date: string): Notice {
      const xp = xpOf(events);
      const snap = get().snapshot!;
      const log = snap.dayLogs.find((l) => l.date === date);
      const plans = makePlanLookup(snap.workoutPlans, snap.dietPlans);
      const tday = log ? trainingDayFor(date, plans.workout(log.workoutPlanVersion)) : null;
      const workoutCleared =
        !!log && !!tday && tday.exerciseIds.length > 0 && tday.exerciseIds.every((id) => {
          const def = plans.workout(log.workoutPlanVersion).exercises[id];
          return (log.exercises[id]?.sets.filter((s) => s.done).length ?? 0) >= (def?.targetSets ?? 99);
        });
      if (workoutCleared && xp > 10) return { tag: "Quest Complete", text: `${tday!.title} day cleared.${xpText(xp)}`, tone: "ember" };
      return { tag: "Quest Complete", text: `${name} ${verb}.${xpText(xp)}`, tone: "ember" };
    }
  });
}
