"use client";
import { useEffect, useRef } from "react";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Bottom sheet. The panel is capped at the phone width so it lines up with the centered
// column on desktop, and stretches full width on a real phone. While open it locks page
// scroll, closes on Escape, keeps keyboard focus inside, and restores focus on close.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusablesIn = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    focusablesIn()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const f = focusablesIn();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[440px]">
        <div
          ref={panelRef}
          className="safe-bottom max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card px-5 pt-2.5 pb-5 shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
          {title && <div className="mb-3 text-center text-[15px] font-semibold">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
