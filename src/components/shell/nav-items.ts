import { IconLog, IconProgress, IconQuest, IconStatus, IconSystem } from "@/components/icons";

/** Exactly five destinations. Order drives the direction of page transitions. */
export const NAV_ITEMS = [
  { href: "/app/status", label: "Status", Icon: IconStatus },
  { href: "/app/quest", label: "Quest", Icon: IconQuest },
  { href: "/app/log", label: "Log", Icon: IconLog },
  { href: "/app/progress", label: "Progress", Icon: IconProgress },
  { href: "/app/system", label: "System", Icon: IconSystem },
] as const;

export function navIndexFor(pathname: string): number {
  const i = NAV_ITEMS.findIndex((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return i === -1 ? 1 : i;
}
