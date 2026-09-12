import type { Metadata } from "next";
import { LogScreen } from "@/components/log/LogScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Log", description: "Your workout split and meal plan." };

export default function LogPage() {
  return (
    <AppTransition>
      <LogScreen />
    </AppTransition>
  );
}
