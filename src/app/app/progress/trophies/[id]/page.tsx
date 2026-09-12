import { TrophyScreen } from "@/components/progress/TrophyScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export default async function TrophyPage(props: PageProps<"/app/progress/trophies/[id]">) {
  const { id } = await props.params;
  return (
    <AppTransition>
      <TrophyScreen id={id} />
    </AppTransition>
  );
}
