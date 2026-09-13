import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repository } from "./repo";
import {
  DayLogSchema,
  DietPlanSchema,
  ProfileSchema,
  SettingsSchema,
  SuppliesSchema,
  WeighInSchema,
  WorkoutPlanSchema,
  type DayLog,
  type DietPlan,
  type Profile,
  type Settings,
  type Snapshot,
  type Supplies,
  type WeighIn,
  type WorkoutPlan,
} from "@/lib/engine/types";

/* ==========================================================================
   Supabase repository.

   Same interface Dexie implements, so the store and the whole UI are unaware
   of which one is underneath. Rows are (user_id, key) with the object in a
   JSONB payload, and every read revalidates with the same zod schemas the
   local path uses: a row written by an older build fails loudly here rather
   than becoming a strange number on the Status screen.
   ========================================================================== */

type Row = { payload: unknown };

/** Rows that fail their schema are dropped, not crashed on. */
function parseAll<T>(rows: Row[] | null, schema: { safeParse(v: unknown): { success: boolean; data?: T } }): T[] {
  const out: T[] = [];
  for (const r of rows ?? []) {
    const p = schema.safeParse(r.payload);
    if (p.success && p.data !== undefined) out.push(p.data);
  }
  return out;
}

export function createSupabaseRepo(db: SupabaseClient, userId: string): Repository {
  const own = { user_id: userId };

  const upsert = async (table: string, row: Record<string, unknown>) => {
    const { error } = await db.from(table).upsert({ ...own, ...row });
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  const remove = async (table: string, match: Record<string, unknown>) => {
    const { error } = await db.from(table).delete().match({ ...own, ...match });
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  return {
    kind: "supabase",

    async load(): Promise<Snapshot | null> {
      const [profile, settings, supplies, dayLogs, weighIns, workoutPlans, dietPlans] = await Promise.all([
        db.from("profiles").select("payload").eq("user_id", userId).maybeSingle(),
        db.from("settings").select("payload").eq("user_id", userId).maybeSingle(),
        db.from("supplies").select("payload").eq("user_id", userId).maybeSingle(),
        db.from("day_logs").select("payload").eq("user_id", userId),
        db.from("weigh_ins").select("payload").eq("user_id", userId),
        db.from("workout_plans").select("payload").eq("user_id", userId).order("version"),
        db.from("diet_plans").select("payload").eq("user_id", userId).order("version"),
      ]);

      for (const r of [profile, settings, supplies, dayLogs, weighIns, workoutPlans, dietPlans]) {
        if (r.error) throw new Error(r.error.message);
      }

      const parsedSettings = settings.data ? SettingsSchema.safeParse(settings.data.payload) : null;
      const parsedSupplies = supplies.data ? SuppliesSchema.safeParse(supplies.data.payload) : null;
      const plans = parseAll<WorkoutPlan>(workoutPlans.data, WorkoutPlanSchema);
      const diets = parseAll<DietPlan>(dietPlans.data, DietPlanSchema);

      // An account with no seed yet is not an error, it is a new Hunter.
      if (!parsedSettings?.success || !parsedSupplies?.success || !plans.length || !diets.length) return null;

      const parsedProfile = profile.data ? ProfileSchema.safeParse(profile.data.payload) : null;

      return {
        profile: parsedProfile?.success ? parsedProfile.data : null,
        settings: parsedSettings.data,
        supplies: parsedSupplies.data,
        dayLogs: parseAll<DayLog>(dayLogs.data, DayLogSchema),
        weighIns: parseAll<WeighIn>(weighIns.data, WeighInSchema),
        workoutPlans: plans,
        dietPlans: diets,
      };
    },

    saveProfile: (p: Profile) => upsert("profiles", { payload: p }),
    saveSettings: (s: Settings) => upsert("settings", { payload: s }),
    saveSupplies: (s: Supplies) => upsert("supplies", { payload: s }),

    saveDayLog: (l: DayLog) => upsert("day_logs", { date: l.date, payload: l }),
    deleteDayLog: (date: string) => remove("day_logs", { date }),

    saveWeighIn: (w: WeighIn) => upsert("weigh_ins", { date: w.date, payload: w }),
    deleteWeighIn: (date: string) => remove("weigh_ins", { date }),

    saveWorkoutPlan: (p: WorkoutPlan) => upsert("workout_plans", { version: p.version, payload: p }),
    saveDietPlan: (p: DietPlan) => upsert("diet_plans", { version: p.version, payload: p }),

    async replaceAll(s: Snapshot) {
      await this.clear();
      const rows = <T,>(list: T[], key: (t: T) => Record<string, unknown>) =>
        list.map((t) => ({ ...own, ...key(t), payload: t }));

      type Result = { error: { message: string } | null };
      const writes: PromiseLike<Result>[] = [
        db.from("settings").upsert({ ...own, payload: s.settings }),
        db.from("supplies").upsert({ ...own, payload: s.supplies }),
        db.from("workout_plans").upsert(rows(s.workoutPlans, (p) => ({ version: p.version }))),
        db.from("diet_plans").upsert(rows(s.dietPlans, (p) => ({ version: p.version }))),
      ];
      if (s.profile) writes.push(db.from("profiles").upsert({ ...own, payload: s.profile }));
      if (s.dayLogs.length) writes.push(db.from("day_logs").upsert(rows(s.dayLogs, (l) => ({ date: l.date }))));
      if (s.weighIns.length) writes.push(db.from("weigh_ins").upsert(rows(s.weighIns, (w) => ({ date: w.date }))));

      for (const r of await Promise.all(writes)) {
        if (r?.error) throw new Error(r.error.message);
      }
    },

    async clear() {
      // Order does not matter: every table is keyed by user_id alone.
      await Promise.all(
        ["profiles", "settings", "supplies", "day_logs", "weigh_ins", "workout_plans", "diet_plans"].map((t) =>
          db.from(t).delete().eq("user_id", userId),
        ),
      );
    },
  };
}
