"use client";
import clsx from "clsx";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "min-h-11 flex-1 rounded-xl py-2.5 text-[14px] font-medium transition",
            value === o.value ? "bg-card text-ink shadow-sm" : "text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
