"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_ITEMS } from "./nav-items";
import { useGame, useGameActions } from "@/lib/store/GameProvider";

/**
 * Cmd+K palette. Opens and closes with no animation: this is a
 * keyboard action a power user hits many times a day, and animating it
 * would only make it feel slower.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { actions } = useGameActions();
  const skin = useGame((s) => s.snapshot?.settings.skin ?? "system");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="System command"
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
      overlayClassName="fixed inset-0 bg-ink-0/80"
      contentClassName="relative w-full max-w-[520px] border border-line-2 bg-ink-1"
    >
      <Command.Input
        placeholder="Type a command"
        className="t-body h-14 w-full border-b border-line-1 bg-transparent px-4 text-frost-0 outline-none placeholder:text-frost-2"
      />
      <Command.List className="max-h-[52vh] overflow-y-auto p-2">
        <Command.Empty className="t-small px-3 py-6 text-center text-frost-2">
          No command matches that.
        </Command.Empty>
        <Command.Group heading="GO TO" className="[&_[cmdk-group-heading]]:t-micro [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-frost-2">
          {NAV_ITEMS.map((item) => (
            <Item key={item.href} onSelect={() => go(item.href)}>
              <item.Icon size={16} />
              {item.label}
            </Item>
          ))}
          <Item onSelect={() => go("/app/log/diet/supplies")}>Supplies list</Item>
          <Item onSelect={() => go("/app/system/plan/workout")}>Edit workout plan</Item>
          <Item onSelect={() => go("/app/system/plan/diet")}>Edit diet plan</Item>
        </Command.Group>
        <Command.Group heading="SYSTEM" className="[&_[cmdk-group-heading]]:t-micro [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-frost-2">
          <Item
            onSelect={() => {
              void actions.saveSettings({ skin: skin === "whiteout" ? "permafrost" : "whiteout" });
              onOpenChange(false);
            }}
          >
            Switch skin to {skin === "whiteout" ? "Permafrost" : "Whiteout"}
          </Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="t-small flex h-11 cursor-pointer items-center gap-3 px-3 text-frost-1 transition-none data-[selected=true]:bg-ink-2 data-[selected=true]:text-frost-0"
    >
      {children}
    </Command.Item>
  );
}
