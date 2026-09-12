import type { Metadata } from "next";
import { SystemScreen } from "@/components/system-screen/SystemScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "System", description: "Hunter profile, preferences, plans and data." };

export default function SystemPage() {
  return (
    <AppTransition>
      <SystemScreen />
    </AppTransition>
  );
}
