"use client";

import { useState } from "react";
import { Button, EmptyState, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { CompletionSquare, StrikeLabel } from "@/components/quest/QuestBits";
import { IconClose, IconPlus, IconReset } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { formatShort, weekStart } from "@/lib/engine/dates";

/** Weekly shopping list. Resets itself each ISO week, or on demand. */
export function SuppliesScreen() {
  const supplies = useGame((s) => s.snapshot?.supplies ?? null);
  const today = useGame((s) => s.today);
  const { actions } = useGameActions();
  const [draft, setDraft] = useState("");

  if (!supplies) return <Placeholder height={280} />;

  const save = (items: typeof supplies.items) => void actions.saveSupplies({ ...supplies, items });
  const checked = supplies.items.filter((i) => i.checked).length;

  return (
    <>
      <PageHeader
        title="Supplies"
        meta={
          <span className="t-micro text-frost-2">
            WEEK OF {formatShort(supplies.weekOf).toUpperCase()} / {checked} OF {supplies.items.length}
          </span>
        }
        action={
          <Button
            size="sm"
            onClick={() => void actions.saveSupplies({ weekOf: weekStart(today), items: supplies.items.map((i) => ({ ...i, checked: false })) })}
          >
            <IconReset size={14} />
            Reset week
          </Button>
        }
      />

      <Panel>
        {supplies.items.length ? (
          <ul>
            {supplies.items.map((item) => (
              <li key={item.id} className="row-rule flex items-center gap-3 px-4 py-1">
                <button
                  type="button"
                  onClick={() => save(supplies.items.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))}
                  aria-pressed={item.checked}
                  className="pressable flex min-h-14 flex-1 items-center gap-3 text-left"
                >
                  <CompletionSquare done={item.checked} size={20} />
                  <StrikeLabel done={item.checked} className="t-body">
                    {item.name}
                  </StrikeLabel>
                </button>
                <button
                  type="button"
                  onClick={() => save(supplies.items.filter((i) => i.id !== item.id))}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center text-frost-2 transition-none hov:text-fault"
                  aria-label={`Remove ${item.name}`}
                >
                  <IconClose size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="LIST EMPTY" body="Add what you need for the week. It clears itself every Monday." />
        )}

        <form
          className="flex gap-2 border-t border-line-1 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const name = draft.trim();
            if (!name) return;
            save([...supplies.items, { id: `supply-${Date.now()}`, name, checked: false }]);
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an item"
            aria-label="Add a supply item"
            className="t-body h-12 flex-1 border border-line-2 bg-ink-2 px-3 text-frost-0 outline-none placeholder:text-frost-2 focus-visible:border-ember"
          />
          <Button type="submit" variant="primary" aria-label="Add item">
            <IconPlus size={16} />
          </Button>
        </form>
      </Panel>
    </>
  );
}
