"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Camera, CameraOff, Loader2, Sun, RectangleHorizontal } from "lucide-react";
import { buttonClass } from "./ui";
import { Skeleton } from "./ui";
import { createManualBill } from "@/app/actions";

type Phase = "idle" | "reading" | "error";

// "Snap a receipt". Uses the phone's native camera (most reliable on iOS), shows a reading
// state while Claude pulls the items out, and a friendly retry if the photo was no good.
export function Capture({ label = "Snap a receipt", className }: { label?: string; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase("reading");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      if (!res.ok) {
        setPhase("error");
        return;
      }
      const { billId } = await res.json();
      router.push(`/bill/${billId}/review`);
    } catch {
      setPhase("error");
    }
  }

  async function enterManually() {
    const id = await createManualBill();
    router.push(`/bill/${id}/review`);
  }

  return (
    <>
      <button className={clsx(buttonClass("primary"), className)} onClick={() => inputRef.current?.click()}>
        <Camera size={18} /> {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      {phase === "reading" && (
        <Overlay>
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
            <div className="h-12 w-9 shrink-0 rounded-md bg-line" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Loader2 size={16} className="spin text-brand" /> Reading your receipt…
              </div>
              <p className="mt-1 text-[13px] text-ink-2">
                Pulling out items, tax and tip. This takes a few seconds.
              </p>
            </div>
          </div>
          <div className="mt-6 text-[12px] font-medium tracking-wide text-ink-3">FOUND SO FAR</div>
          <div className="mt-3 space-y-3">
            {[88, 70, 80, 60, 75].map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3.5" style={{ width: `${w}%` } as React.CSSProperties} />
                <Skeleton className="h-3.5 w-10" />
              </div>
            ))}
          </div>
        </Overlay>
      )}

      {phase === "error" && (
        <Overlay>
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-danger">
              <CameraOff size={26} />
            </div>
            <h2 className="mt-5 text-[20px] font-semibold">We couldn&apos;t read that receipt</h2>
            <p className="mt-2 max-w-xs text-[14px] text-ink-2">
              The photo was a little blurry. For the best read, lay the receipt flat in good
              light and fit it inside the frame.
            </p>
            <div className="mt-5 flex gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] text-brand">
                <Sun size={14} /> Good light
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] text-brand">
                <RectangleHorizontal size={14} /> Lay flat
              </span>
            </div>
          </div>
          <div className="space-y-2.5">
            <button className={buttonClass("secondary")} onClick={enterManually}>
              Enter items manually
            </button>
            <button className={buttonClass("primary")} onClick={() => inputRef.current?.click()}>
              <Camera size={18} /> Retake photo
            </button>
          </div>
        </Overlay>
      )}
    </>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-page">
      <div className="safe-top safe-bottom mx-auto flex h-full w-full max-w-[440px] flex-col px-5 pt-6 pb-4">
        {children}
      </div>
    </div>
  );
}
