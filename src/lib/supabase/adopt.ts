"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createDexieRepo } from "@/lib/data/dexie-repo";
import { createSupabaseRepo } from "@/lib/data/supabase-repo";
import { isSetUp } from "@/lib/engine/types";

/**
 * First sign-in on a device that already has an arc.
 *
 * If the account is empty and this device is not, the local arc is adopted:
 * pushed up as-is so nothing is lost. If the account holds anything at all, the
 * account wins and the local copy is left alone, because the account is the one
 * thing that follows the Challenger between devices.
 *
 * "Empty" has to mean empty. This runs on every launch, and adopting over an
 * account that merely had no profile yet, or one that could not be read, would
 * replace real training with whatever this device happened to keep.
 *
 * Returns what happened, so the caller can say so.
 */
export async function adoptLocalArc(
  db: SupabaseClient,
  userId: string,
): Promise<"adopted" | "account-already-had-one" | "nothing-local"> {
  const remote = createSupabaseRepo(db, userId);
  // A load that cannot be read throws, and that stops this where it stands.
  const existing = await remote.load();
  if (existing) return "account-already-had-one";

  // Only an arc someone set up themselves is worth carrying over. One left from
  // the pre-filled onboarding holds another person's details, and copying it in
  // is exactly how a new account ended up showing them.
  const local = await createDexieRepo().load();
  if (!isSetUp(local?.profile)) return "nothing-local";

  await remote.replaceAll(local);
  return "adopted";
}
