import { notFound } from "next/navigation";
import { WorkoutDayScreen } from "@/components/log/WorkoutDayScreen";
import { AppTransition } from "@/components/shell/AppTransition";
import { DAY_KEYS, type DayKey } from "@/lib/engine/types";

export default async function WorkoutDayPage(props: PageProps<"/app/log/workout/[day]">) {
  const { day } = await props.params;
  if (!(DAY_KEYS as readonly string[]).includes(day)) notFound();
  return (
    <AppTransition>
      <WorkoutDayScreen day={day as DayKey} />
    </AppTransition>
  );
}
