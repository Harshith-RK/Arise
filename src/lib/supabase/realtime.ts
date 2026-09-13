"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/** Tables whose changes the client cares about. */
export const SYNCED_TABLES = [
  "profiles",
  "settings",
  "supplies",
  "day_logs",
  "weigh_ins",
  "workout_plans",
  "diet_plans",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/**
 * Subscribes to this Hunter's rows on every synced table.
 *
 * The filter is a convenience, not the security boundary: row level security is
 * what actually stops another user's rows arriving, so a tampered filter yields
 * nothing rather than someone else's arc.
 *
 * `onChange` fires for any insert, update or delete. The caller reloads rather
 * than patching row by row, because the engine derives everything from the full
 * log in one pass anyway, and a reload cannot drift.
 */
export function subscribeToArc(
  db: SupabaseClient,
  userId: string,
  onChange: (table: SyncedTable) => void,
): RealtimeChannel {
  const channel = db.channel(`arc:${userId}`);

  for (const table of SYNCED_TABLES) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      () => onChange(table),
    );
  }

  void channel.subscribe();
  return channel;
}
