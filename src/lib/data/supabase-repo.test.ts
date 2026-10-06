import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, seedDietPlan, seedProfile, seedSupplies, seedWorkoutPlan } from "@/lib/data/seed";
import { createSupabaseRepo } from "./supabase-repo";

/* ==========================================================================
   The account is the only copy that follows a Challenger between devices, and
   the store seeds a fresh one whenever a load comes back empty. So the line
   these tests hold is: "empty" means nothing is there, never "I could not read
   what is there". Answering the second with the first deletes an arc.
   ========================================================================== */

const TODAY = "2026-10-06";
const rows = (over: Partial<Record<string, unknown>> = {}) => ({
  profiles: { payload: seedProfile(TODAY) },
  settings: { payload: DEFAULT_SETTINGS },
  supplies: { payload: seedSupplies(TODAY) },
  workout_plans: [{ payload: seedWorkoutPlan() }],
  diet_plans: [{ payload: seedDietPlan() }],
  day_logs: [],
  weigh_ins: [],
  ...over,
});

/** The slice of the Supabase client this repository actually uses. */
function fakeDb(table: Record<string, unknown>, writes: { table: string; row: unknown }[] = []) {
  return {
    from(name: string) {
      const data = table[name];
      const single = !Array.isArray(data);
      const result = { data: data ?? (single ? null : []), error: null };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => Promise.resolve({ data: data ?? [], error: null }),
        maybeSingle: () => Promise.resolve(result),
        upsert: (row: unknown) => {
          writes.push({ table: name, row });
          return Promise.resolve({ error: null });
        },
        delete: () => ({ match: () => Promise.resolve({ error: null }), eq: () => Promise.resolve({ error: null }) }),
        then: (f: (r: unknown) => unknown) => Promise.resolve(result).then(f),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("the account repository", () => {
  it("reads an account back", async () => {
    const repo = createSupabaseRepo(fakeDb(rows()), "u1");
    const snap = await repo.load();
    expect(snap?.profile?.name).toBeTruthy();
    expect(snap?.workoutPlans).toHaveLength(1);
  });

  it("says empty only when the account holds nothing at all", async () => {
    const empty = { profiles: null, settings: null, supplies: null, workout_plans: [], diet_plans: [], day_logs: [], weigh_ins: [] };
    expect(await createSupabaseRepo(fakeDb(empty), "u1").load()).toBeNull();
  });

  it("refuses to call an unreadable account empty", async () => {
    // One corrupt row used to answer "empty", which made the store seed a new
    // arc over the top of a real one.
    const cases = [
      rows({ settings: { payload: { skin: "nonsense" } } }),
      rows({ supplies: { payload: { weekOf: "not-a-date", items: [] } } }),
      rows({ workout_plans: [{ payload: { version: 1 } }] }),
      rows({ diet_plans: [{ payload: { version: 1, createdAt: "x", meals: [] } }] }),
      rows({ day_logs: [{ payload: { date: "2026-10-06" } }] }),
    ];
    for (const table of cases) {
      const repo = createSupabaseRepo(fakeDb(table), "u1");
      await expect(repo.load()).rejects.toThrow(/could not be read/);
    }
  });

  it("reports a missing part of an account rather than seeding over it", async () => {
    const repo = createSupabaseRepo(fakeDb(rows({ settings: null })), "u1");
    await expect(repo.load()).rejects.toThrow(/could not be read/);
  });

  it("refuses to write what it could not read back", async () => {
    const writes: { table: string; row: unknown }[] = [];
    const repo = createSupabaseRepo(fakeDb(rows(), writes), "u1");
    const plan = seedDietPlan();
    // Thirteen meals in a day is past the schema, so the save stops here
    // instead of leaving a plan the next launch cannot parse.
    const tooMany = { ...plan, meals: Array.from({ length: 13 }, (_, i) => ({ ...plan.meals[0], id: `m${i}` })) };
    await expect(repo.saveDietPlan(tooMany)).rejects.toThrow(/cannot be saved/);
    expect(writes).toHaveLength(0);
  });

  it("checks everything before replaceAll deletes anything", async () => {
    const writes: { table: string; row: unknown }[] = [];
    const repo = createSupabaseRepo(fakeDb(rows(), writes), "u1");
    const snap = {
      profile: seedProfile(TODAY),
      settings: DEFAULT_SETTINGS,
      supplies: seedSupplies(TODAY),
      workoutPlans: [seedWorkoutPlan()],
      dietPlans: [{ ...seedDietPlan(), meals: [] }],
      dayLogs: [],
      weighIns: [],
    };
    await expect(repo.replaceAll(snap)).rejects.toThrow(/cannot be saved/);
    expect(writes).toHaveLength(0);
  });
});
