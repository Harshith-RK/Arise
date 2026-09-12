import { BadgeScreen } from "@/components/progress/BadgeScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export default async function BadgePage(props: PageProps<"/app/progress/badges/[id]">) {
  const { id } = await props.params;
  return (
    <AppTransition>
      <BadgeScreen id={id} />
    </AppTransition>
  );
}
