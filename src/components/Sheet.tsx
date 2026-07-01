"use client";
import { useEffect } from "react";

// Bottom sheet. The panel is capped at the phone width so it lines up with the centered
// column on desktop, and stretches full width on a real phone.
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[440px]">
        <div className="safe-bottom rounded-t-3xl bg-card px-5 pt-2.5 pb-5 shadow-[0_-8px_40px_rgba(0,0,0,0.18)]">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />
          {title && <div className="mb-3 text-center text-[15px] font-semibold">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
