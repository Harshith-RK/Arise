"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createDexieRepo } from "@/lib/data/dexie-repo";
import { createSupabaseRepo } from "@/lib/data/supabase-repo";

/**
 * First sign-in on a device that already has an arc.
 *
 * If the account is empty and this device is not, the local arc is adopted:
 * pushed up as-is so nothing is lost. If the account already holds an arc, the
 * account wins and the local copy is left alone, because the account is the one
 * thing that follows the Hunter between devices.
 *
 * Returns what happened, so the caller can say so.
 */
export async function adoptLocalArc(
  db: SupabaseClient,
  userId: string,
): Promise<"adopted" | "account-already-had-one" | "nothing-local"> {
  const remote = createSupabaseRepo(db, userId);
  const existing = await remote.load();
  if (existing?.profile) return "account-already-had-one";

  const local = await createDexieRepo().load();
  if (!local?.profile) return "nothing-local";

  await remote.replaceAll(local);
  return "adopted";
}
