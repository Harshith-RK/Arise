import type { Metadata } from "next";
import { AwakenShell } from "@/components/awaken/AwakenShell";

export const metadata: Metadata = {
  title: "Awakening",
  description: "Set up your Hunter profile and begin the arc.",
};

export default function AwakenPage() {
  return <AwakenShell />;
}
