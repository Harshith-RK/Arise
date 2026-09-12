"use client";

import { useGame } from "@/lib/store/GameProvider";
import { QuestScreen } from "./QuestScreen";
import { Placeholder } from "@/components/system/primitives";

/** Today's quest. The date comes from the store so it rolls at local midnight. */
export function QuestToday() {
  const today = useGame((s) => s.today);
  const ready = useGame((s) => s.status === "ready");
  if (!ready) {
    return (
      <div className="space-y-4">
        <Placeholder height={132} />
        <Placeholder height={220} />
      </div>
    );
  }
  return <QuestScreen date={today} />;
}
