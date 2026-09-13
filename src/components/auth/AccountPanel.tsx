"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Panel } from "@/components/system/primitives";
import { notify } from "@/components/system/notify";
import { HAS_BACKEND } from "@/lib/supabase/env";
import { signOut, useAuth } from "@/lib/supabase/session";

/**
 * Account state on the System screen. Says plainly where the arc is stored,
 * because "on this device" and "on your account" have very different
 * consequences if the phone is lost.
 */
export function AccountPanel({ className }: { className?: string }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);

  if (!HAS_BACKEND || auth.status === "loading") return null;

  return (
    <Panel title="Account" className={className}>
      <div className="border-t border-line-1 px-4 py-4">
        {auth.status === "signed-in" ? (
          <>
            <p className="t-micro text-frost-2">SIGNED IN AS</p>
            <p className="t-body mt-1 break-all text-frost-0">{auth.email ?? "your account"}</p>
            <p className="t-micro mt-3 text-frost-2">
              YOUR ARC SAVES TO YOUR ACCOUNT AND UPDATES LIVE ON EVERY DEVICE YOU SIGN IN ON.
            </p>
            <Button
              className="mt-4"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await signOut();
                notify({ tag: "Notice", text: "Signed out. This device keeps its own copy.", tone: "neutral" });
                setBusy(false);
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <p className="t-body text-frost-0">This arc lives on this device only.</p>
            <p className="t-micro mt-2 text-frost-2">
              SIGN IN TO KEEP IT ON YOUR ACCOUNT. WHAT IS ALREADY HERE COMES WITH YOU.
            </p>
            <Link
              href="/auth?next=/app/system"
              className="pressable t-readout mt-4 inline-flex h-11 items-center border border-ember px-4 text-ember transition-none"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </Panel>
  );
}
