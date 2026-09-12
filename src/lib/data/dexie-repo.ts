import Dexie, { type EntityTable } from "dexie";
import type { DayLog, DietPlan, Profile, Settings, Snapshot, Supplies, WeighIn, WorkoutPlan } from "@/lib/engine/types";
import type { Repository } from "./repo";

/* ==========================================================================
   IndexedDB via Dexie. Single-row tables use a fixed key.
   ========================================================================== */

type KV<T> = { key: string; value: T };

class WinterArcDB extends Dexie {
  kv!: EntityTable<KV<unknown>, "key">;
  dayLogs!: EntityTable<DayLog, "date">;
  weighIns!: EntityTable<WeighIn, "date">;
  workoutPlans!: EntityTable<WorkoutPlan, "version">;
  dietPlans!: EntityTable<DietPlan, "version">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      kv: "key",
      dayLogs: "date",
      weighIns: "date",
      workoutPlans: "version",
      dietPlans: "version",
    });
  }
}

export function createDexieRepo(name = "winter-arc"): Repository {
  const db = new WinterArcDB(name);

  async function getKV<T>(key: string): Promise<T | null> {
    const row = await db.kv.get(key);
    return (row?.value as T | undefined) ?? null;
  }
  async function putKV<T>(key: string, value: T) {
    await db.kv.put({ key, value });
  }

  return {
    kind: "dexie",

    async load() {
      const [settings, profile, supplies, dayLogs, weighIns, workoutPlans, dietPlans] = await Promise.all([
        getKV<Settings>("settings"),
        getKV<Profile>("profile"),
        getKV<Supplies>("supplies"),
        db.dayLogs.toArray(),
        db.weighIns.toArray(),
        db.workoutPlans.toArray(),
        db.dietPlans.toArray(),
      ]);
      if (!settings || !supplies || !workoutPlans.length || !dietPlans.length) return null;
      return { settings, profile, supplies, dayLogs, weighIns, workoutPlans, dietPlans };
    },

    saveProfile: (p) => putKV("profile", p),
    saveSettings: (s) => putKV("settings", s),
    saveSupplies: (s) => putKV("supplies", s),
    saveDayLog: async (l) => {
      await db.dayLogs.put(l);
    },
    deleteDayLog: async (date) => {
      await db.dayLogs.delete(date);
    },
    saveWeighIn: async (w) => {
      await db.weighIns.put(w);
    },
    deleteWeighIn: async (date) => {
      await db.weighIns.delete(date);
    },
    saveWorkoutPlan: async (p) => {
      await db.workoutPlans.put(p);
    },
    saveDietPlan: async (p) => {
      await db.dietPlans.put(p);
    },

    async replaceAll(s: Snapshot) {
      await db.transaction("rw", [db.kv, db.dayLogs, db.weighIns, db.workoutPlans, db.dietPlans], async () => {
        await Promise.all([db.kv.clear(), db.dayLogs.clear(), db.weighIns.clear(), db.workoutPlans.clear(), db.dietPlans.clear()]);
        await db.kv.bulkPut([
          { key: "settings", value: s.settings },
          { key: "supplies", value: s.supplies },
          ...(s.profile ? [{ key: "profile", value: s.profile }] : []),
        ]);
        await db.dayLogs.bulkPut(s.dayLogs);
        await db.weighIns.bulkPut(s.weighIns);
        await db.workoutPlans.bulkPut(s.workoutPlans);
        await db.dietPlans.bulkPut(s.dietPlans);
      });
    },

    async clear() {
      await db.transaction("rw", [db.kv, db.dayLogs, db.weighIns, db.workoutPlans, db.dietPlans], async () => {
        await Promise.all([db.kv.clear(), db.dayLogs.clear(), db.weighIns.clear(), db.workoutPlans.clear(), db.dietPlans.clear()]);
      });
    },
  };
}
