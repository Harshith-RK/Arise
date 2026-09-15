"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, PageHeader, Panel, Placeholder } from "@/components/system/primitives";
import { Field, Toggle } from "@/components/system/Field";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { StorageNote } from "@/components/auth/StorageNote";
import { notify } from "@/components/system/notify";
import { IconExport, IconForward, IconImport, IconReset } from "@/components/icons";
import { useGame, useGameActions } from "@/lib/store/GameProvider";
import { parseImport, type ImportPreview } from "@/lib/data/repo";
import { ProfileSchema, type DayKey, type Settings } from "@/lib/engine/types";
import { DAY_TITLES } from "@/lib/engine/dates";

export function SystemScreen() {
  const snapshot = useGame((s) => s.snapshot);
  const { actions, dispatch } = useGameActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [resetText, setResetText] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  if (!snapshot?.profile) return <Placeholder height={320} />;
  const { profile, settings } = snapshot;

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => void actions.saveSettings({ [key]: value });

  const saveProfile = async (patch: Partial<typeof profile>) => {
    const parsed = ProfileSchema.safeParse({ ...profile, ...patch });
    if (!parsed.success) {
      notify({ tag: "Warning", text: parsed.error.issues[0]?.message ?? "That value is out of range.", tone: "fault" });
      return;
    }
    dispatch(await actions.saveProfile(parsed.data));
  };

  const exportData = () => {
    const file = actions.exportData();
    if (!file) return;
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `winter-arc-${file.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify({ tag: "Notice", text: "Backup exported to your downloads.", tone: "neutral" });
  };

  return (
    <>
      <PageHeader title="System" meta={<span className="t-micro text-frost-2">V1.0</span>} />

      <AccountPanel className="mb-4" />

      {/* Hunter profile */}
      <Panel title="Hunter" className="mb-4">
        <div className="grid gap-3 border-t border-line-1 px-4 py-4 sm:grid-cols-2">
          <Field label="NAME" value={profile.name} onChange={(v) => void saveProfile({ name: v })} />
          <Field label="HEIGHT" suffix="CM" type="number" step={0.1} value={profile.heightCm} onChange={(v) => void saveProfile({ heightCm: Number(v) })} />
          <Field label="START WEIGHT" suffix="KG" type="number" step={0.1} value={profile.startWeightKg} onChange={(v) => void saveProfile({ startWeightKg: Number(v) })} />
          <Field label="TARGET WEIGHT" suffix="KG" type="number" step={0.1} value={profile.targetWeightKg} onChange={(v) => void saveProfile({ targetWeightKg: Number(v) })} />
          <Field label="PHASE 1 TARGET" suffix="KG" type="number" step={0.1} value={profile.phase1TargetKg} onChange={(v) => void saveProfile({ phase1TargetKg: Number(v) })} helper="The first milestone on the Status rule." />
          <Field label="BMR" suffix="KCAL" type="number" value={profile.bmr} onChange={(v) => void saveProfile({ bmr: Number(v) })} helper="Set by Apply in Targets. Edit only if you have a measured value." />
          <Field label="CALORIE TARGET" suffix="KCAL" type="number" value={profile.kcalTarget} onChange={(v) => void saveProfile({ kcalTarget: Number(v), targetSource: "manual" })} helper="Training days only. Rest days carry no calorie target." />
          <Field label="PROTEIN TARGET" suffix="G" type="number" value={profile.proteinTarget} onChange={(v) => void saveProfile({ proteinTarget: Number(v), targetSource: "manual" })} />
          <Field label="GYM FROM" type="time" value={profile.gymStart} onChange={(v) => void saveProfile({ gymStart: v })} />
          <Field label="GYM UNTIL" type="time" value={profile.gymEnd} onChange={(v) => void saveProfile({ gymEnd: v })} />
        </div>
        <div className="border-t border-line-1 px-4 py-4">
          <p className="t-micro mb-2 text-frost-2">REST DAYS</p>
          <div className="grid grid-cols-4 gap-1 min-[400px]:grid-cols-7">
            {(Object.keys(DAY_TITLES) as DayKey[]).map((d) => {
              const on = profile.restDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  // The visible letter is ambiguous on its own: Saturday and
                  // Sunday are both "S", and Tuesday and Thursday both "T".
                  aria-label={`${DAY_TITLES[d]} is a rest day`}
                  onClick={() => void saveProfile({ restDays: on ? profile.restDays.filter((x) => x !== d) : [...profile.restDays, d] })}
                  className="pressable t-micro h-12 border border-line-2 text-frost-2 transition-none aria-pressed:border-glacier aria-pressed:bg-ink-3 aria-pressed:text-glacier"
                >
                  {d.slice(0, 3).toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Just the numbers here. The calculation, the details behind it and the
          plans built from it live on their own page. */}
      <Panel title="Targets" className="mb-4">
        <div className="grid grid-cols-2 gap-px border-t border-line-1 bg-line-1">
          {[
            ["INTAKE", `${profile.kcalTarget}`, "KCAL"],
            ["PROTEIN", `${profile.proteinTarget}`, "G"],
          ].map(([label, value, unit]) => (
            <div key={label} className="bg-ink-1 px-4 py-3">
              <p className="t-micro text-frost-2">{label}</p>
              <p className="mt-1 text-frost-0">
                <span className="t-num" style={{ fontSize: 24, lineHeight: 1 }}>
                  {value}
                </span>
                <span className="t-micro ml-1 text-frost-2">{unit}</span>
              </p>
            </div>
          ))}
        </div>
        <PlanLink
          href="/app/system/targets"
          title="Targets and plans"
          meta={
            !profile.sex || profile.age === undefined
              ? "ADD YOUR DETAILS TO CALCULATE"
              : profile.targetSource === "manual" || !profile.targetSource
                ? "SET BY HAND / RECALCULATE OR BUILD PLANS"
                : "SET BY THE SYSTEM / RECALCULATE OR BUILD PLANS"
          }
        />
      </Panel>

      {/* Preferences */}
      <Panel title="Interface" className="mb-4">
        <div className="space-y-px border-t border-line-1 bg-line-1">
          <Choice
            label="Skin"
            value={settings.skin}
            options={[
              { value: "system", label: "System" },
              { value: "permafrost", label: "Permafrost" },
              { value: "whiteout", label: "Whiteout" },
            ]}
            onChange={(v) => setSetting("skin", v)}
          />
          <Choice
            label="Motion"
            value={settings.motion}
            options={[
              { value: "system", label: "System" },
              { value: "full", label: "Full" },
              { value: "reduced", label: "Reduced" },
            ]}
            onChange={(v) => setSetting("motion", v)}
          />
          <div className="surface-well px-4 py-3">
            <Toggle label="Sound" checked={settings.sound} onChange={(v) => setSetting("sound", v)} helper="A tone when the rest timer ends." />
          </div>
          <div className="surface-well px-4 py-3">
            <Toggle label="Haptics" checked={settings.haptics} onChange={(v) => setSetting("haptics", v)} helper="A tick when a quest clears." />
          </div>
          <div className="surface-well px-4 py-4">
            <Field
              label="REST TIMER"
              suffix="SECONDS"
              type="number"
              value={settings.restSeconds}
              onChange={(v) => setSetting("restSeconds", Math.max(15, Math.min(600, Number(v) || 90)))}
            />
          </div>
        </div>
      </Panel>

      {/* Plans */}
      <Panel title="Plans" className="mb-4">
        <div className="border-t border-line-1">
          <PlanLink href="/app/system/plan/workout" title="Workout plan" meta={`VERSION ${snapshot.workoutPlans.length}`} />
          <PlanLink href="/app/system/plan/diet" title="Diet plan" meta={`VERSION ${snapshot.dietPlans.length}`} />
        </div>
      </Panel>

      {/* Data */}
      <Panel title="Data" className="mb-4">
        <div className="border-t border-line-1 px-4 py-4">
          <p className="t-small text-frost-1">
            Everything lives on this device. Export a backup before clearing your browser data, or to move to a new phone.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={exportData}>
              <IconExport size={15} />
              Export JSON
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <IconImport size={15} />
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              aria-label="Choose a Winter Arc backup file to import"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const result = parseImport(await file.text());
                if (!result.ok) {
                  notify({ tag: "Warning", text: result.error, tone: "fault" });
                  return;
                }
                setPreview(result);
              }}
            />
          </div>

          {preview ? (
            <div className="mt-4 border border-line-2 px-4 py-4">
              <p className="t-readout text-frost-0">Replace everything with this backup?</p>
              <dl className="mt-3 space-y-1">
                <Row k="HUNTER" v={preview.summary.name ?? "Not set"} />
                <Row k="DAYS LOGGED" v={String(preview.summary.days)} />
                <Row k="WEIGH-INS" v={String(preview.summary.weighIns)} />
                <Row k="RANGE" v={preview.summary.from ? `${preview.summary.from} TO ${preview.summary.to}` : "NONE"} />
                <Row k="EXPORTED" v={preview.summary.exportedAt.slice(0, 10)} />
              </dl>
              <div className="mt-4 flex gap-3">
                <Button className="flex-1" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={async () => {
                    await actions.importData(preview.snapshot);
                    setPreview(null);
                    notify({ tag: "Notice", text: "Backup restored.", tone: "neutral" });
                  }}
                >
                  Replace
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line-1 px-4 py-4">
          {resetOpen ? (
            <div>
              <p className="t-small text-frost-1">
                This erases every log, weigh-in and record on this device, and starts a new arc. Type RESET to confirm.
              </p>
              <div className="mt-3 flex gap-3">
                <input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  aria-label="Type RESET to confirm"
                  className="t-readout h-12 flex-1 border border-line-2 bg-ink-2 px-3 text-frost-0 outline-none focus-visible:border-fault"
                />
                <Button
                  variant="danger"
                  disabled={resetText !== "RESET"}
                  onClick={async () => {
                    await actions.resetArc();
                    setResetOpen(false);
                    setResetText("");
                  }}
                >
                  Reset arc
                </Button>
              </div>
              <button type="button" className="t-micro mt-3 text-frost-2 hov:text-frost-0" onClick={() => setResetOpen(false)}>
                CANCEL
              </button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              <IconReset size={15} />
              Reset arc
            </Button>
          )}
        </div>
      </Panel>

      <Panel title="About">
        <div className="border-t border-line-1 px-4 py-4">
          <StorageNote />
          <div className="mt-3 flex gap-4">
            <Link href="/legal/terms" className="inline-flex min-h-11 items-center t-micro text-ember hov:text-core">
              TERMS
            </Link>
            <Link href="/legal/privacy" className="inline-flex min-h-11 items-center t-micro text-ember hov:text-core">
              PRIVACY
            </Link>
          </div>
        </div>
      </Panel>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="t-micro text-frost-2">{k}</dt>
      <dd className="t-micro text-frost-0">{v}</dd>
    </div>
  );
}

function PlanLink({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="pressable row-rule flex h-16 items-center gap-3 px-4 transition-none hov:bg-ink-2">
      <span className="flex-1">
        <span className="t-body block text-frost-0">{title}</span>
        <span className="t-micro mt-0.5 block text-frost-2">{meta}</span>
      </span>
      <IconForward size={16} className="text-frost-2" />
    </Link>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="surface-well px-4 py-4">
      <p className="t-micro mb-2 text-frost-2">{label.toUpperCase()}</p>
      <div className="flex border border-line-2" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className="pressable t-micro h-11 flex-1 border-r border-line-2 px-2 text-frost-2 transition-none last:border-r-0 aria-pressed:bg-ember aria-pressed:text-on-ember"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
