"use client";

import { useState } from "react";
import { useAuth, useSignOut } from "@/lib/supabase/session";

/**
 * A way out of an account from a screen that has no settings to put one in.
 * Onboarding sends every other route back to itself, so without this a Hunter
 * who signed in with the wrong Google account could only leave by finishing a
 * profile they did not mean to create.
 */
export function SignedInAs({ className }: { className?: string }) {
  const auth = useAuth();
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);

  if (auth.status !== "signed-in") return null;

  return (
    <p className={`t-micro text-frost-2 ${className ?? ""}`}>
      SIGNED IN AS <span className="break-all text-frost-1">{auth.email ?? "YOUR ACCOUNT"}</span>
      {" · "}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void signOut();
        }}
        className="pressable text-ember underline underline-offset-4 transition-none"
      >
        NOT YOU? SIGN OUT
      </button>
    </p>
  );
}
