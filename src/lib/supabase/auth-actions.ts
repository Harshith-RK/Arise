"use client";

import { supabase } from "./client";

export type AuthResult =
  | { ok: true }
  /** Account created, but the project still requires email confirmation. */
  | { ok: false; needsConfirmation: true; error: string }
  | { ok: false; error: string };

/** Supabase's messages are terse and lowercase. Say it the way the System would. */
function say(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password do not match.";
  if (m.includes("already registered")) return "That email already has a Hunter. Sign in instead.";
  if (m.includes("password should be")) return "Use at least six characters.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a moment.";
  if (m.includes("email address") && m.includes("invalid")) return "That is not a valid email.";
  return message;
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  const db = supabase();
  if (!db) return { ok: false, error: "No backend configured." };
  const { data, error } = await db.auth.signUp({ email: email.trim(), password });
  if (error) return { ok: false, error: say(error.message) };
  // With confirmation off, signUp returns a session and the Hunter is in. With
  // it on, it returns a user and no session: say so rather than sending them
  // into an app they are not actually signed in to.
  if (!data.session) {
    return {
      ok: false,
      needsConfirmation: true,
      error: "Account created. Check your email to confirm it, then sign in.",
    };
  }
  return { ok: true };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const db = supabase();
  if (!db) return { ok: false, error: "No backend configured." };
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: say(error.message) };
  return { ok: true };
}

/** Leaves the page: Google takes over, then returns to /auth/callback. */
export async function signInWithGoogle(next = "/app/quest"): Promise<AuthResult> {
  const db = supabase();
  if (!db) return { ok: false, error: "No backend configured." };
  const { error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) return { ok: false, error: say(error.message) };
  return { ok: true };
}
