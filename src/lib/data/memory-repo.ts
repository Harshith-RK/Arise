import type { Snapshot } from "@/lib/engine/types";
import type { Repository } from "./repo";

/**
 * In-memory repository. Powers the landing page sandbox demo (resets on
 * reload, never touches real data) and unit tests.
 */
export function createMemoryRepo(initial: Snapshot | null = null): Repository {
  let s: Snapshot | null = initial ? structuredClone(initial) : null;
  const need = () => {
    if (!s) throw new Error("Memory repo not initialised");
    return s;
  };
  const upsert = <T, K extends keyof T>(list: T[], item: T, key: K) => {
    const i = list.findIndex((x) => x[key] === item[key]);
    if (i >= 0) list[i] = item;
    else list.push(item);
  };

  return {
    kind: "memory",
    load: async () => (s ? structuredClone(s) : null),
    saveProfile: async (p) => void (need().profile = p),
    saveSettings: async (x) => void (need().settings = x),
    saveSupplies: async (x) => void (need().supplies = x),
    saveDayLog: async (l) => upsert(need().dayLogs, l, "date"),
    deleteDayLog: async (date) => void (need().dayLogs = need().dayLogs.filter((l) => l.date !== date)),
    saveWeighIn: async (w) => upsert(need().weighIns, w, "date"),
    deleteWeighIn: async (date) => void (need().weighIns = need().weighIns.filter((w) => w.date !== date)),
    saveWorkoutPlan: async (p) => upsert(need().workoutPlans, p, "version"),
    saveDietPlan: async (p) => upsert(need().dietPlans, p, "version"),
    replaceAll: async (x) => void (s = structuredClone(x)),
    clear: async () => void (s = null),
  };
}
