import { notFound } from "next/navigation";
import { WorkoutPlanEditor } from "@/components/system-screen/WorkoutPlanEditor";
import { AppTransition } from "@/components/shell/AppTransition";

/** "new" copies the newest version; a number edits that version. */
export default async function WorkoutPlanVersionPage(props: PageProps<"/app/system/plan/workout/[version]">) {
  const { version } = await props.params;
  if (version !== "new" && !/^\d+$/.test(version)) notFound();
  return (
    <AppTransition>
      <WorkoutPlanEditor
        version={version === "new" ? undefined : Number(version)}
        mode={version === "new" ? "copy" : "edit"}
      />
    </AppTransition>
  );
}
