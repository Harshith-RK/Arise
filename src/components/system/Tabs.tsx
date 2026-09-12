"use client";

/**
 * Two-state segmented control. The selected segment is a solid block, so it
 * reads without relying on colour. It does not animate: switching tabs is a
 * frequent action, and motion here would only add latency.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="mb-4 flex border border-line-2" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className="pressable t-readout h-12 flex-1 border-r border-line-2 px-3 text-frost-2 transition-none last:border-r-0 aria-selected:bg-ember aria-selected:text-on-ember"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
