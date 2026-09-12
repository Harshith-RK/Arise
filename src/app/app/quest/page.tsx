import type { Metadata } from "next";
import { QuestToday } from "@/components/quest/QuestToday";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = {
  title: "Daily Quest",
  description: "Today's workout, meals and cardio.",
};

export default function QuestPage() {
  return (
    <AppTransition>
      <QuestToday />
    </AppTransition>
  );
}
