import type { Metadata } from "next";
import { ProgressScreen } from "@/components/progress/ProgressScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Progress", description: "Weight, body composition and trophies." };

export default function ProgressPage() {
  return (
    <AppTransition>
      <ProgressScreen />
    </AppTransition>
  );
}
