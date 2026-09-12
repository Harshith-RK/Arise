import type { Metadata } from "next";
import { SuppliesScreen } from "@/components/log/SuppliesScreen";
import { AppTransition } from "@/components/shell/AppTransition";

export const metadata: Metadata = { title: "Supplies", description: "This week's shopping list." };

export default function SuppliesPage() {
  return (
    <AppTransition>
      <SuppliesScreen />
    </AppTransition>
  );
}
