"use client";
import { Minus, Plus } from "lucide-react";

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Fewer"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink active:bg-line disabled:opacity-40"
      >
        <Minus size={18} />
      </button>
      <span className="min-w-7 text-center text-[18px] font-semibold tnum">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="More"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink active:bg-line disabled:opacity-40"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
