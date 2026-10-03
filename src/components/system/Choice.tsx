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
      {/* Past four options a single row squeezes each one under a thumb's width
          on a small phone, so it wraps to rows of four until there is room.

          The longest label decides the type size for the whole group, never for
          one cell: a row where one word is smaller than its neighbours reads as
          a mistake. The size holds at the usual 11px once there is room for it. */}
      <div
        className={`[&_button]:text-[clamp(8.5px,2.6vw,11px)] ${
          options.length > 4
            ? "grid grid-cols-4 gap-1 min-[400px]:grid-cols-7"
            : options.length === 4
              ? "grid grid-cols-2 gap-1 min-[400px]:grid-cols-4"
              : "grid gap-1"
        }`}
        style={options.length > 4 || options.length === 4 ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            // Filled when selected: ember text on a dark well fails contrast at the
            // coldest rank, so this uses the pair the contrast script checks.
            className="pressable t-micro min-h-11 whitespace-nowrap border border-line-2 px-1 py-1 text-center leading-tight text-frost-1 transition-none aria-pressed:border-ember aria-pressed:bg-ember aria-pressed:text-on-ember"
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
      {/* The same scale as Choice, so a panel holding both does not read as two
          different type sizes stacked on each other. */}
      <div className="flex flex-wrap gap-1 [&_button]:text-[clamp(8.5px,2.6vw,11px)]">
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
