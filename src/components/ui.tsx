import clsx from "clsx";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "soft";

// Solid avatar colors. Index 0 is the brand green, which is always "you".
const AVATAR_BG = ["bg-brand", "bg-p1", "bg-p2", "bg-p3", "bg-p4", "bg-p5"];

export function buttonClass(variant: ButtonVariant = "primary"): string {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-medium transition active:scale-[.99] select-none";
  const byVariant: Record<ButtonVariant, string> = {
    primary: "bg-brand text-white",
    secondary: "bg-card text-ink border border-line-strong",
    ghost: "bg-transparent text-ink-2",
    dark: "bg-ink text-white",
    soft: "bg-brand-soft text-brand",
  };
  return clsx(base, byVariant[variant]);
}

/** A button styled as a link, for navigation CTAs. */
export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clsx(buttonClass(variant), className)}>
      {children}
    </Link>
  );
}

function initials(name: string): string {
  const t = name.trim();
  return t ? t[0].toUpperCase() : "?";
}

export function Avatar({
  name,
  colorIndex = 0,
  size = 36,
  className,
}: {
  name: string;
  colorIndex?: number;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        AVATAR_BG[colorIndex % AVATAR_BG.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name)}
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-card", className)}>{children}</div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={clsx("skeleton", className)} style={style} />;
}

/** Phone-first page shell: full width on a phone, centered at phone width on desktop. */
export function Screen({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-page", className)}>
      {children}
    </div>
  );
}

export function Header({
  title,
  subtitle,
  backHref,
  right,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="safe-top flex items-center gap-2.5 px-5 pt-4 pb-2">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-line"
        >
          <ChevronLeft size={22} />
        </Link>
      )}
      {(title || subtitle) && (
        <div className="min-w-0 flex-1">
          {title && <div className="truncate text-[17px] font-semibold leading-tight">{title}</div>}
          {subtitle && <div className="truncate text-[13px] text-ink-2">{subtitle}</div>}
        </div>
      )}
      {right && <div className="ml-auto flex items-center">{right}</div>}
    </header>
  );
}

/** The action area pinned under the content. Children are usually one or two buttons. */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-bottom mt-auto space-y-2.5 border-t border-line bg-page px-5 pt-3 pb-4">
      {children}
    </div>
  );
}
