import type { Metadata } from "next";
import { StatusScreen } from "@/components/status/StatusScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = {
  title: "Hunter Status",
  description: "Level, rank, attributes, streaks and body readout.",
};

export default function StatusPage() {
  return (
    <AppTransition>
      <StatusScreen />
    </AppTransition>
  );
}
