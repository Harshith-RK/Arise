import type { Metadata } from "next";
import { WorkoutPlanVersions } from "@/components/system-screen/WorkoutPlanVersions";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Workout plan", description: "Your versions, and how they rotate." };

export default function WorkoutPlanPage() {
  return (
    <AppTransition>
      <WorkoutPlanVersions />
    </AppTransition>
  );
}
