"use client";

/**
 * One choice from a short list, as a row of pressed buttons. For two to four
 * options where a dropdown would hide the answer behind a tap.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  helper,
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  error?: string | null;
  helper?: string;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="t-micro mb-1.5 text-frost-2">{label}</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            // Filled when selected: ember text on a dark well fails contrast at the
            // coldest rank, so this uses the pair the contrast script checks.
            className="pressable t-micro h-11 border border-line-2 px-1 text-frost-1 transition-none aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-on-ember"
          >
            {o.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="t-micro mt-1.5 text-fault">{error}</p>
      ) : helper ? (
        <p className="t-micro mt-1.5 text-frost-2">{helper}</p>
      ) : null}
    </div>
  );
}

/** Any number of choices from a list, as pressed buttons that wrap. */
export function MultiChoice<T extends string>({
  label,
  value,
  options,
  onChange,
  helper,
}: {
  label: string;
  value: readonly T[];
  options: readonly { value: T; label: string }[];
  onChange: (v: T[]) => void;
  helper?: string;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="t-micro mb-1.5 text-frost-2">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className="pressable t-micro h-10 border border-line-2 px-3 text-frost-1 transition-none aria-pressed:border-glacier aria-pressed:bg-ink-3 aria-pressed:text-glacier"
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {helper ? <p className="t-micro mt-1.5 text-frost-2">{helper}</p> : null}
    </div>
  );
}
