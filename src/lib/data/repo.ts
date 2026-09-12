import { z } from "zod";
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
   Repository: the only door to persistence. The UI never touches Dexie
   directly, so a Supabase sync implementation can slot in later.
   ========================================================================== */

export interface Repository {
  readonly kind: "dexie" | "memory";
  load(): Promise<Snapshot | null>;
  saveProfile(p: Profile): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  saveDayLog(l: DayLog): Promise<void>;
  deleteDayLog(date: string): Promise<void>;
  saveWeighIn(w: WeighIn): Promise<void>;
  deleteWeighIn(date: string): Promise<void>;
  saveWorkoutPlan(p: WorkoutPlan): Promise<void>;
  saveDietPlan(p: DietPlan): Promise<void>;
  saveSupplies(s: Supplies): Promise<void>;
  replaceAll(s: Snapshot): Promise<void>;
  clear(): Promise<void>;
}

/* ---------- Versioned export format ---------- */

export const EXPORT_FORMAT = "winter-arc-export";
export const EXPORT_VERSION = 1;

export const ExportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string(),
  data: z.object({
    profile: ProfileSchema.nullable(),
    settings: SettingsSchema,
    workoutPlans: z.array(WorkoutPlanSchema).min(1),
    dietPlans: z.array(DietPlanSchema).min(1),
    dayLogs: z.array(DayLogSchema),
    weighIns: z.array(WeighInSchema),
    supplies: SuppliesSchema,
  }),
});
export type ExportFile = z.infer<typeof ExportFileSchema>;

export function toExportFile(s: Snapshot, now = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), data: s };
}

export type ImportPreview = {
  ok: true;
  snapshot: Snapshot;
  summary: { name: string | null; days: number; weighIns: number; from: string | null; to: string | null; exportedAt: string };
};

export function parseImport(text: string): ImportPreview | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  const parsed = ExportFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "file";
    return { ok: false, error: `Not a Winter Arc export. Problem at ${where}: ${issue?.message ?? "invalid"}.` };
  }
  const data = parsed.data.data;
  const dates = data.dayLogs.map((d) => d.date).sort();
  return {
    ok: true,
    snapshot: data,
    summary: {
      name: data.profile?.name ?? null,
      days: data.dayLogs.length,
      weighIns: data.weighIns.length,
      from: dates[0] ?? null,
      to: dates.at(-1) ?? null,
      exportedAt: parsed.data.exportedAt,
    },
  };
}
