import { ExerciseScreen } from "@/components/log/ExerciseScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export default async function ExercisePage(props: PageProps<"/app/log/exercise/[id]">) {
  const { id } = await props.params;
  return (
    <AppTransition>
      <ExerciseScreen exerciseId={id} />
    </AppTransition>
  );
}
