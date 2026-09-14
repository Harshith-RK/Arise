"use client";

import { useEffect, useState } from "react";
import { loadPlanModel, type PlanModel } from "./model";

/**
 * The trained model, once its chunk arrives. Null until then, and null for good
 * if it fails to load (offline on first visit), in which case targets come from
 * the formula and say so. Nothing waits on it.
 */
export function usePlanModel(): PlanModel | null {
  const [model, setModel] = useState<PlanModel | null>(null);
  useEffect(() => {
    let live = true;
    loadPlanModel()
      .then((m) => {
        if (live) setModel(m);
      })
      .catch(() => {
        /* formula fallback */
      });
    return () => {
      live = false;
    };
  }, []);
  return model;
}
