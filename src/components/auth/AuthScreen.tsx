"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/system/Field";
import { Button } from "@/components/system/primitives";
import { MotionScope } from "@/components/system/MotionScope";
import { SystemWindow } from "@/components/system/SystemWindow";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/supabase/auth-actions";

type Mode = "in" | "up";

/**
 * The door. Email and password, or Google. Nothing to confirm: a new Hunter is
 * signed in the moment the account exists, because a verification email between
 * someone and their first workout is a place to lose them.
 */
export function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app/quest";
  const signedOut = params.get("signed-out") === "1";

  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (!email.trim()) return setError("Enter an email.");
    if (password.length < 6) return setError("Use at least six characters.");

    setBusy(true);
    const result =
      mode === "in"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      // Confirmation is meant to be off. If it is not, at least point them at
      // the door that does work.
      if ("needsConfirmation" in result) setMode("in");
      return;
    }
    router.replace(next);
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle(next);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
    }
    // On success the browser leaves for Google, so busy stays true.
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col justify-center px-4 py-10">
      <MotionScope>
        <SystemWindow bodyClassName="px-5 py-6 sm:px-7 sm:py-8">
          <h1 className="t-title text-frost-0">
            {mode === "in" ? "Sign in" : "Create your Hunter"}
          </h1>
          <p className="t-micro mt-1.5 text-frost-2">
            {mode === "in"
              ? "YOUR ARC FOLLOWS YOU TO EVERY DEVICE."
              : "EMAIL AND A PASSWORD. NOTHING TO CONFIRM."}
          </p>

          {signedOut ? (
          <p className="t-micro mt-5 border border-line-2 px-3 py-2 text-frost-1" role="status">
            SIGNED OUT. YOUR ARC IS SAFE ON YOUR ACCOUNT.
          </p>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-3">
            <Field
              label="EMAIL"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              autoFocus
            />
            <Field
              label="PASSWORD"
              name="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={setPassword}
              helper={mode === "up" ? "At least six characters." : undefined}
            />

            {error ? (
              <p
                className="t-micro border border-fault px-3 py-2 text-fault"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy}
            >
              {busy ? "Working" : mode === "in" ? "Sign in" : "Create Hunter"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-line-1" />
            <span className="t-micro text-frost-2">OR</span>
            <span className="h-px flex-1 bg-line-1" />
          </div>

          <Button
            type="button"
            onClick={() => void google()}
            disabled={busy}
            className="w-full"
          >
            Continue with Google
          </Button>

          <p className="t-small mt-6 text-frost-2">
            {mode === "in" ? "No Hunter yet? " : "Already have one? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError(null);
              }}
              className="pressable text-ember underline underline-offset-4 transition-none"
            >
              {mode === "in" ? "Create one" : "Sign in"}
            </button>
          </p>
        </SystemWindow>
      </MotionScope>
    </main>
  );
}
