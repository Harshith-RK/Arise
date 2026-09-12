import type { Metadata } from "next";
import { WorkoutPlanEditor } from "@/components/system-screen/WorkoutPlanEditor";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Workout plan", description: "Edit your split." };

export default function WorkoutPlanPage() {
  return (
    <AppTransition>
      <WorkoutPlanEditor />
    </AppTransition>
  );
}
