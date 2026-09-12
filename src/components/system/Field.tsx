"use client";

import { useId } from "react";

/**
 * Form field. Visible label above the control, error text directly beneath
 * it, helper text when there is something worth saying.
 */
export function Field({
  label,
  value,
  onChange,
  error,
  helper,
  suffix,
  type = "text",
  inputMode,
  step,
  autoFocus,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  error?: string | null;
  helper?: string;
  suffix?: string;
  type?: "text" | "number" | "time";
  inputMode?: "text" | "decimal" | "numeric";
  step?: number;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  return (
    <div>
      <label htmlFor={id} className="t-micro block text-frost-2">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch border border-line-2 focus-within:border-ember">
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          step={step}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          className="t-body h-12 w-full bg-ink-2 px-3 text-frost-0 outline-none placeholder:text-frost-2"
        />
        {suffix ? <span className="t-micro flex items-center border-l border-line-2 bg-ink-2 px-3 text-frost-2">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={errorId} className="t-micro mt-1.5 text-fault">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="t-micro mt-1.5 text-frost-2">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Square toggle. Checked state fills with ember and adds a label change. */
export function Toggle({
  label,
  checked,
  onChange,
  helper,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="pressable flex w-full items-center justify-between gap-4 border border-line-2 bg-ink-2 px-4 py-3 text-left transition-none hov:border-frost-2"
    >
      <span>
        <span className="t-small block text-frost-0">{label}</span>
        {helper ? <span className="t-micro mt-0.5 block text-frost-2">{helper}</span> : null}
      </span>
      <span
        className="relative h-6 w-11 shrink-0 border"
        style={{ borderColor: checked ? "var(--ember)" : "var(--line-2)", background: checked ? "var(--ember-3)" : "transparent" }}
      >
        <span
          className="absolute top-[3px] h-[16px] w-[16px] transition-none"
          style={{ left: checked ? 23 : 3, background: checked ? "var(--ember)" : "var(--frost-2)" }}
        />
      </span>
    </button>
  );
}
