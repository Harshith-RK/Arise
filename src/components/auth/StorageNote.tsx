"use client";

import { HAS_BACKEND } from "@/lib/supabase/env";
import { useAuth } from "@/lib/supabase/session";

/**
 * Where this Hunter's data actually is, said plainly. The answer changes with
 * whether they are signed in, and a claim about data handling that is only
 * sometimes true is worse than no claim at all.
 */
export function StorageNote() {
  const auth = useAuth();

  if (!HAS_BACKEND) {
    return (
      <p className="t-small text-frost-1">
        Winter Arc runs entirely on this device. No account, no tracking, no data leaves your browser.
      </p>
    );
  }
  if (auth.status === "signed-in") {
    return (
      <p className="t-small text-frost-1">
        Your arc is saved to your account and to this device, and syncs between the two. Only you can read it. No
        tracking, no analytics, no advertising.
      </p>
    );
  }
  return (
    <p className="t-small text-frost-1">
      This arc is on this device only. Nothing has left your browser. Sign in and it saves to your account as well, so
      it survives a lost phone.
    </p>
  );
}
