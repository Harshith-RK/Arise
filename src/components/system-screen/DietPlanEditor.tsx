"use client";

import { useState } from "react";
import { Choice } from "@/components/system/Choice";
import { Button, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { Field } from "@/components/system/Field";
import { IconClose, IconPlus } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { DAY_TITLES, dayKeyOf } from "@/lib/engine/dates";
import { DAY_KEYS, type DayKey, type DietPlan, type Macros, type MealDef } from "@/lib/engine/types";
import { countItems } from "@/lib/plan/count-items";

const DAY_OPTIONS = DAY_KEYS.map((d) => ({ value: d, label: DAY_TITLES[d].slice(0, 3).toUpperCase() }));

/**
 * A meal's numbers. Counted from the items where the food library knows them,
 * which is the usual case, and typed by hand where it does not or where a
 * Hunter would rather say it themselves.
 */
function MealMacros({
  meal,
  slot,
  patch,
  onTyped,
  texts,
  setText,
}: {
  meal: MealDef;
  /** Where the meal sits: the same meal id can appear on several days. */
  slot: string;
  patch: (id: string, p: Partial<MealDef>) => void;
  onTyped: (slot: string) => void;
  texts: Record<string, string>;
  setText: (key: string, raw: string) => void;
}) {
  const counted = countItems(meal.items);
  const countable = counted.uncounted.length === 0;
  const matches = countable && sameMacros(counted.macros, meal);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {MACRO_FIELDS.map(([label, key, name]) => (
          <Field
            key={key}
            label={label}
            type="number"
            inputMode="numeric"
            value={texts[`${slot}:${key}`] ?? String(meal[key])}
            onChange={(v) => {
              onTyped(slot);
              setText(`${slot}:${key}`, v);
              if (!macroError(key, v)) patch(meal.id, { [key]: Number(v) });
            }}
            error={macroError(key, texts[`${slot}:${key}`] ?? String(meal[key]))}
            ariaLabel={`${meal.name} ${name}`}
          />
        ))}
      </div>
      <p className="t-micro mt-1.5 text-frost-2">
        {matches ? (
          "COUNTED FROM THE ITEMS ABOVE."
        ) : countable ? (
          <>
            THE ITEMS COUNT AS {counted.macros.kcal} KCAL, {counted.macros.protein} G PROTEIN.{" "}
            <button
              type="button"
              onClick={() => {
                for (const [, key] of MACRO_FIELDS) setText(`${slot}:${key}`, String(counted.macros[key]));
                patch(meal.id, counted.macros);
              }}
              className="pressable text-ember underline underline-offset-2 transition-none"
            >
              USE THAT
            </button>
          </>
        ) : (
          `NOT IN THE FOOD LIST: ${counted.uncounted.join(", ").toUpperCase()}. TYPE THIS MEAL'S NUMBERS YOURSELF.`
        )}
      </p>
    </div>
  );
}

const totalsOf = (meals: MealDef[]) =>
  meals.reduce(
    (t, m) => ({ protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat, kcal: t.kcal + m.kcal }),
    { protein: 0, carbs: 0, fat: 0, kcal: 0 },
  );

const MACRO_FIELDS = [
  ["P", "protein", "protein"],
  ["C", "carbs", "carbs"],
  ["F", "fat", "fat"],
  ["KCAL", "kcal", "calories"],
] as const;

const MACRO_MAX: Record<keyof Macros, number> = { protein: 1000, carbs: 2000, fat: 1000, kcal: 10000 };

/** The problem with what is typed in one macro box, or null. Empty is a problem, not a zero. */
function macroError(key: keyof Macros, raw: string): string | null {
  if (raw.trim() === "") return "Enter a number";
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > MACRO_MAX[key]) return `0 to ${MACRO_MAX[key]}`;
  return null;
}

const sameMacros = (a: Macros, b: Pick<MealDef, "protein" | "carbs" | "fat" | "kcal">) =>
  a.protein === b.protein && a.carbs === b.carbs && a.fat === b.fat && a.kcal === b.kcal;

/**
 * The diet plan, open for editing. Saving either corrects the current version
 * everywhere it is used or keeps it and starts a new one from today, the same
 * two choices the workout editor offers.
 */
export function DietPlanEditor() {
  const snapshot = useGame((s) => s.snapshot);
  const { actions, dispatch } = useGameActions();
  // null means "untouched": the current plan version is shown as-is.
  const [edited, setEdited] = useState<DietPlan | null>(null);
  const [dirty, setDirty] = useState(false);
  // Meals whose numbers were typed by hand here. Editing their items no longer
  // writes over what was typed; every other meal follows its items.
  const [typed, setTyped] = useState<Set<string>>(new Set());
  // What is in each macro box, kept as text so a box can sit empty while a
  // number is being replaced. Only a valid number reaches the plan.
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Open on today: that is the day Quest and Log are showing, so an edit here
  // is the one the Hunter expects to see there.
  const today = useGame((s) => s.today);
  const [day, setDay] = useState<DayKey>(() => dayKeyOf(today));

  const current = snapshot?.dietPlans.reduce((a, b) => (b.version > a.version ? b : a));

  if (!snapshot || !current) return <Placeholder height={320} />;

  // The draft falls back to the live plan until the first edit.
  const draft = edited ?? current;

  const update = (next: DietPlan) => {
    setEdited(next);
    setDirty(true);
  };

  // A plan either gives each weekday its own meals or shares one list. Edits
  // go to the day on screen, and never touch the other days.
  const perDay = !!draft.days;
  const meals = perDay ? (draft.days?.[day] ?? draft.meals) : draft.meals;
  const setMeals = (list: MealDef[]) =>
    perDay
      ? update({ ...draft, days: { ...draft.days, [day]: list }, meals: day === "mon" ? list : draft.meals })
      : update({ ...draft, meals: list });
  const patch = (id: string, p: Partial<MealDef>) => setMeals(meals.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const scope = perDay ? day : "all";
  const slotOf = (id: string) => `${scope}/${id}`;

  /**
   * Items are the source of the numbers. Rewriting them recounts the meal, as
   * long as the meal is still being counted: once a Hunter types a number by
   * hand that meal is theirs, and the editor stops writing over it.
   */
  const setItems = (meal: MealDef, text: string) => {
    const items = text.split(",").map((t) => t.trim()).filter(Boolean);
    const after = countItems(items);
    const follows = !typed.has(slotOf(meal.id)) && after.uncounted.length === 0;
    patch(meal.id, follows ? { items, ...after.macros } : { items });
  };

  const totals = totalsOf(meals);

  // Only boxes someone has typed into can be wrong; untouched ones show the
  // plan. A removed meal's boxes no longer count against saving.
  const liveSlots = new Set(
    draft.days
      ? Object.entries(draft.days).flatMap(([d, list]) => (list ?? []).map((m) => `${d}/${m.id}`))
      : draft.meals.map((m) => `all/${m.id}`),
  );
  const invalid = Object.entries(texts).some(([k, raw]) => {
    const [slot, key] = k.split(":");
    return liveSlots.has(slot) && !!macroError(key as keyof Macros, raw);
  });

  const setText = (key: string, raw: string) => {
    setTexts((t) => ({ ...t, [key]: raw }));
    setDirty(true);
  };

  const save = async (how: "update" | "new") => {
    if (invalid || saving) return;
    setSaving(true);
    const body = draft.days ? { meals: draft.meals, days: draft.days } : { meals: draft.meals };
    dispatch(await (how === "update" ? actions.updateDietPlan(body) : actions.saveDietPlan(body)));
    setEdited(null);
    setTexts({});
    setTyped(new Set());
    setDirty(false);
    setSaving(false);
  };

  const bar = dirty ? (
    <SaveBar version={current.version} invalid={invalid} saving={saving} onSave={save} />
  ) : null;

  return (
    <>
      <PageHeader title="Diet plan" meta={<span className="t-micro text-frost-2">EDITING V{current.version}</span>} />

      {bar}

      <Panel title={perDay ? "Days" : "Every day"} className="mb-4">
        <div className="border-t border-line-1 px-4 py-4">
          {perDay ? (
            <Choice label="EDITING" value={day} options={DAY_OPTIONS} onChange={setDay} />
          ) : (
            <>
              <p className="t-small text-frost-1">Every day of the week eats the same meals.</p>
              <Button
                className="mt-3"
                onClick={() => update({ ...draft, days: Object.fromEntries(DAY_KEYS.map((d) => [d, draft.meals])) })}
              >
                Give each day its own meals
              </Button>
            </>
          )}
        </div>
      </Panel>

      <Panel title={perDay ? `${DAY_TITLES[day]} totals` : "Plan totals"} className="mb-4">
        <dl className="grid grid-cols-4 gap-px border-t border-line-1 bg-line-1">
          {[
            ["PROTEIN", `${totals.protein} G`, `OF ${snapshot.profile?.proteinTarget ?? 0} G`],
            ["CARBS", `${totals.carbs} G`, null],
            ["FAT", `${totals.fat} G`, null],
            ["CALORIES", `${totals.kcal}`, `OF ${snapshot.profile?.kcalTarget ?? 0}`],
          ].map(([k, v, against]) => (
            <div key={k} className="surface-well px-3 py-3">
              <dt className="t-micro text-frost-2">{k}</dt>
              <dd className="t-readout mt-1 text-frost-0">{v}</dd>
              {against ? <dd className="t-micro mt-1 text-frost-2">{against}</dd> : null}
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Meals" meta={`${meals.length} ${perDay ? `ON ${DAY_TITLES[day].toUpperCase()}` : "PER DAY"}`}>
        <ul className="border-t border-line-1">
          {meals.map((meal) => (
            <li key={meal.id} className="row-rule px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="TIME" type="time" value={meal.time} onChange={(v) => patch(meal.id, { time: v })} />
                    <div className="col-span-2">
                      <Field label="NAME" value={meal.name} onChange={(v) => patch(meal.id, { name: v })} />
                    </div>
                  </div>
                  <Field
                    label="ITEMS"
                    value={meal.items.join(", ")}
                    onChange={(v) => setItems(meal, v)}
                    helper="Separate items with a comma, and give each an amount: Paneer 100g, Roti x2."
                  />
                  <MealMacros
                    meal={meal}
                    slot={slotOf(meal.id)}
                    patch={patch}
                    onTyped={(id) => setTyped((t) => (t.has(id) ? t : new Set(t).add(id)))}
                    texts={texts}
                    setText={setText}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMeals(meals.filter((m) => m.id !== meal.id))}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center text-frost-2 transition-none hov:text-fault"
                  aria-label={`Remove ${meal.name}`}
                >
                  <IconClose size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-line-1 p-3">
          <Button
            className="w-full"
            onClick={() =>
              setMeals([
                ...meals,
                {
                  id: `${perDay ? `${day}-` : ""}meal-${Date.now()}`,
                  time: "12:00",
                  name: "New meal",
                  items: ["Item"],
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  kcal: 0,
                  group: null,
                },
              ])
            }
          >
            <IconPlus size={15} />
            Add meal
          </Button>
        </div>
      </Panel>

      {bar ? <div className="mt-4">{bar}</div> : null}
    </>
  );
}

/** Both ways to save, and what each one does to days already logged. */
function SaveBar({
  version,
  invalid,
  saving,
  onSave,
}: {
  version: number;
  invalid: boolean;
  saving: boolean;
  onSave: (how: "update" | "new") => void;
}) {
  return (
    <Panel title="Unsaved changes" className="mb-4">
      <div className="space-y-4 border-t border-line-1 px-4 py-4">
        {invalid ? (
          <p className="t-micro text-fault" role="alert">
            FIX THE HIGHLIGHTED NUMBERS BEFORE SAVING.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Button className="w-full" disabled={invalid || saving} onClick={() => onSave("update")}>
              Update version {version}
            </Button>
            <p className="t-micro mt-2 text-frost-2">
              CORRECTS THIS PLAN EVERYWHERE, INCLUDING DAYS ALREADY LOGGED ON IT. UNDO IS OFFERED.
            </p>
          </div>
          <div>
            <Button variant="primary" className="w-full" disabled={invalid || saving} onClick={() => onSave("new")}>
              Save as version {version + 1}
            </Button>
            <p className="t-micro mt-2 text-frost-2">
              APPLIES FROM TODAY. DAYS ALREADY LOGGED KEEP VERSION {version}.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
