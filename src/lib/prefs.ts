import type { Settings } from "@/lib/engine/types";
import type { Rank } from "@/lib/engine/types";
import { PREFS_STORAGE_KEY, RANK_STORAGE_KEY } from "./prefs-script";

/**
 * Mirrors live settings and rank onto <html> and into localStorage, so the
 * next load's inline script (prefs-script.ts) paints correctly with no
 * flash. Call these from client code only.
 */
function resolveSkin(pref: Settings["skin"]): "permafrost" | "whiteout" {
  if (pref !== "system") return pref;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "whiteout" : "permafrost";
}

function resolveMotion(pref: Settings["motion"]): "full" | "reduced" {
  if (pref !== "system") return pref;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function applySettings(settings: Pick<Settings, "skin" | "motion">) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-skin", resolveSkin(settings.skin));
  document.documentElement.setAttribute("data-motion", resolveMotion(settings.motion));
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ ...prev, skin: settings.skin, motion: settings.motion }));
  } catch {
    /* private mode or storage disabled: attributes above still apply for this load */
  }
}

export const HUNTER_MARKER_KEY = "wa:has-hunter";

/**
 * A hint for surfaces that must not open the database (the landing page).
 * The app shell stays the source of truth: if this is stale, the shell just
 * redirects to onboarding.
 */
export function markHunter(exists: boolean) {
  try {
    if (exists) localStorage.setItem(HUNTER_MARKER_KEY, "1");
    else localStorage.removeItem(HUNTER_MARKER_KEY);
  } catch {
    /* ignore */
  }
}

export function hasHunterMarker(): boolean {
  try {
    return localStorage.getItem(HUNTER_MARKER_KEY) === "1";
  } catch {
    return false;
  }
}

export function applyRank(rank: Rank) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-rank", rank);
  try {
    localStorage.setItem(RANK_STORAGE_KEY, rank);
  } catch {
    /* ignore */
  }
}
