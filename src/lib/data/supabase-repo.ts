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

/**
 * A row that does not match its schema is a fault, never a missing row. The
 * difference matters more than anything else in this file: the store seeds a
 * fresh account when a load comes back empty, so answering "empty" to a
 * question we could not read would delete the account it was asked about.
 */
class UnreadableArc extends Error {
  constructor(what: string, detail: string) {
    super(`Your saved ${what} could not be read (${detail}). Nothing has been changed.`);
    this.name = "UnreadableArc";
  }
}

function parseAll<T>(
  what: string,
  rows: Row[] | null,
  schema: { safeParse(v: unknown): { success: boolean; data?: T; error?: { issues: { message: string }[] } } },
): T[] {
  const out: T[] = [];
  for (const r of rows ?? []) {
    const p = schema.safeParse(r.payload);
    if (!p.success || p.data === undefined) throw new UnreadableArc(what, p.error?.issues[0]?.message ?? "unexpected shape");
    out.push(p.data);
  }
  return out;
}

export function createSupabaseRepo(db: SupabaseClient, userId: string): Repository {
  const own = { user_id: userId };

  /**
   * Everything is checked on the way in as well as on the way out. A payload
   * the reader would refuse must never reach the table: the write looks fine,
   * and the account becomes unreadable on the next launch.
   */
  const checked = <T>(what: string, schema: { safeParse(v: unknown): { success: boolean; error?: { issues: { message: string }[] } } }, value: T): T => {
    const p = schema.safeParse(value);
    if (!p.success) throw new Error(`This ${what} cannot be saved: ${p.error?.issues[0]?.message ?? "unexpected shape"}.`);
    return value;
  };

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

      // An account with nothing in it at all is a new Challenger, and the only
      // case that may answer "empty". Anything else present means the account
      // exists, so a part that will not parse is reported, not swallowed.
      const empty =
        !settings.data &&
        !supplies.data &&
        !profile.data &&
        !(workoutPlans.data ?? []).length &&
        !(dietPlans.data ?? []).length &&
        !(dayLogs.data ?? []).length &&
        !(weighIns.data ?? []).length;
      if (empty) return null;

      const parsedSettings = settings.data ? SettingsSchema.safeParse(settings.data.payload) : null;
      if (!parsedSettings?.success) {
        throw new UnreadableArc("settings", parsedSettings ? (parsedSettings.error?.issues[0]?.message ?? "unexpected shape") : "missing");
      }
      const parsedSupplies = supplies.data ? SuppliesSchema.safeParse(supplies.data.payload) : null;
      if (!parsedSupplies?.success) {
        throw new UnreadableArc("supply list", parsedSupplies ? (parsedSupplies.error?.issues[0]?.message ?? "unexpected shape") : "missing");
      }

      const plans = parseAll<WorkoutPlan>("workout plan", workoutPlans.data, WorkoutPlanSchema);
      const diets = parseAll<DietPlan>("diet plan", dietPlans.data, DietPlanSchema);
      if (!plans.length) throw new UnreadableArc("workout plan", "missing");
      if (!diets.length) throw new UnreadableArc("diet plan", "missing");

      const parsedProfile = profile.data ? ProfileSchema.safeParse(profile.data.payload) : null;
      if (profile.data && !parsedProfile?.success) {
        throw new UnreadableArc("profile", parsedProfile?.error?.issues[0]?.message ?? "unexpected shape");
      }

      return {
        profile: parsedProfile?.success ? parsedProfile.data : null,
        settings: parsedSettings.data,
        supplies: parsedSupplies.data,
        dayLogs: parseAll<DayLog>("day log", dayLogs.data, DayLogSchema),
        weighIns: parseAll<WeighIn>("weigh-in", weighIns.data, WeighInSchema),
        workoutPlans: plans,
        dietPlans: diets,
      };
    },

    saveProfile: async (p: Profile) => upsert("profiles", { payload: checked("profile", ProfileSchema, p) }),
    saveSettings: async (s: Settings) => upsert("settings", { payload: checked("setting", SettingsSchema, s) }),
    saveSupplies: async (s: Supplies) => upsert("supplies", { payload: checked("supply list", SuppliesSchema, s) }),

    saveDayLog: async (l: DayLog) => upsert("day_logs", { date: l.date, payload: checked("day", DayLogSchema, l) }),
    deleteDayLog: (date: string) => remove("day_logs", { date }),

    saveWeighIn: async (w: WeighIn) => upsert("weigh_ins", { date: w.date, payload: checked("weigh-in", WeighInSchema, w) }),
    deleteWeighIn: (date: string) => remove("weigh_ins", { date }),

    saveWorkoutPlan: async (p: WorkoutPlan) => upsert("workout_plans", { version: p.version, payload: checked("workout plan", WorkoutPlanSchema, p) }),
    deleteWorkoutPlan: (version: number) => remove("workout_plans", { version }),
    saveDietPlan: async (p: DietPlan) => upsert("diet_plans", { version: p.version, payload: checked("diet plan", DietPlanSchema, p) }),
    deleteDietPlan: (version: number) => remove("diet_plans", { version }),

    async replaceAll(s: Snapshot) {
      // Checked before anything is deleted: this wipes the account first, so a
      // payload that cannot be written must stop the whole operation here.
      if (s.profile) checked("profile", ProfileSchema, s.profile);
      checked("setting", SettingsSchema, s.settings);
      checked("supply list", SuppliesSchema, s.supplies);
      for (const p of s.workoutPlans) checked("workout plan", WorkoutPlanSchema, p);
      for (const p of s.dietPlans) checked("diet plan", DietPlanSchema, p);
      for (const l of s.dayLogs) checked("day", DayLogSchema, l);
      for (const w of s.weighIns) checked("weigh-in", WeighInSchema, w);

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
