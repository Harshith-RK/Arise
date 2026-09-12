import type { Metadata } from "next";
import { DietPlanEditor } from "@/components/system-screen/DietPlanEditor";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Diet plan", description: "Edit your meals and macros." };

export default function DietPlanPage() {
  return (
    <AppTransition>
      <DietPlanEditor />
    </AppTransition>
  );
}
