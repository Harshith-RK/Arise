import type { Metadata } from "next";
import { TargetsScreen } from "@/components/plan/TargetsScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Targets", description: "Your calculated targets and the plans built from them." };

export default function TargetsPage() {
  return (
    <AppTransition>
      <TargetsScreen />
    </AppTransition>
  );
}
