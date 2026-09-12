"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, navIndexFor } from "./nav-items";
import { RankPlaque } from "@/components/system/RankPlaque";
import { useGame } from "@/lib/store/GameProvider";
import { RANK_TITLES } from "@/lib/engine/xp";

/**
 * Five destinations. Bottom bar on mobile (thumb zone, labels always shown),
 * left rail from 1024px. Active state is a colour and a 2px edge marker, so
 * it never depends on colour alone.
 */
export function AppNav() {
  const pathname = usePathname();
  const active = navIndexFor(pathname);

  return (
    <>
      {/* Mobile: bottom bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-1 bg-ink-1 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-[560px]">
          {NAV_ITEMS.map((item, i) => {
            const isActive = i === active;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  transitionTypes={[i > active ? "nav-forward" : i < active ? "nav-back" : "nav-same"]}
                  aria-current={isActive ? "page" : undefined}
                  className="pressable relative flex h-16 flex-col items-center justify-center gap-1 text-frost-2 aria-[current=page]:text-ember"
                >
                  {isActive ? <span className="absolute inset-x-3 top-0 h-0.5 bg-ember" aria-hidden /> : null}
                  <item.Icon size={20} />
                  <span className="t-micro">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: left rail */}
      <nav
        className="fixed inset-y-0 left-0 z-40 hidden w-(--rail) flex-col border-r border-line-1 bg-ink-1 lg:flex"
        aria-label="Primary"
      >
        <HunterMiniCard />
        <ul className="mt-2 flex flex-col">
          {NAV_ITEMS.map((item, i) => {
            const isActive = i === active;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  transitionTypes={[i > active ? "nav-forward" : i < active ? "nav-back" : "nav-same"]}
                  aria-current={isActive ? "page" : undefined}
                  className="pressable relative flex h-12 items-center gap-3 px-5 text-frost-1 transition-none hov:bg-ink-2 hov:text-frost-0 aria-[current=page]:text-ember"
                >
                  {isActive ? <span className="absolute inset-y-2 left-0 w-0.5 bg-ember" aria-hidden /> : null}
                  <item.Icon size={20} />
                  <span className="t-readout">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function HunterMiniCard() {
  const progress = useGame((s) => s.progress);
  const name = useGame((s) => s.snapshot?.profile?.name ?? null);
  if (!progress) return <div className="h-[104px] border-b border-line-1" />;
  return (
    <div className="flex items-center gap-3 border-b border-line-1 px-5 py-5">
      <RankPlaque rank={progress.rank} size={44} />
      <div className="min-w-0">
        <p className="t-readout truncate text-frost-0">{name ?? "Hunter"}</p>
        <p className="t-micro text-frost-2">
          RANK {progress.rank} <span className="text-frost-2">/</span> {RANK_TITLES[progress.rank].toUpperCase()}
        </p>
      </div>
    </div>
  );
}
