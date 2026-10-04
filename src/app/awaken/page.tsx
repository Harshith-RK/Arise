import type { Metadata } from "next";
import { AwakenShell } from "@/components/awaken/AwakenShell";

export const metadata: Metadata = {
  title: "Awakening",
  description: "Set up your Challenger profile and begin.",
};

export default function AwakenPage() {
  return <AwakenShell />;
}
