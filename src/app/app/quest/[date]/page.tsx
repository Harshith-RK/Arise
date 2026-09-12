import { notFound } from "next/navigation";
import { QuestScreen } from "@/components/quest/QuestScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export default async function QuestDatePage(props: PageProps<"/app/quest/[date]">) {
  const { date } = await props.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return (
    <AppTransition>
      <QuestScreen date={date} />
    </AppTransition>
  );
}
