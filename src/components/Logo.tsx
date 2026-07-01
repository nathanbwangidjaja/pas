// The pas mark — a looping "p" with a little leaf, straight from the design file.
export function Logo({ size = 26, color = "var(--color-brand)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="58" cy="60" r="22" stroke={color} strokeWidth="12" />
      <path d="M36 48V92" stroke={color} strokeWidth="12" strokeLinecap="round" />
      <g transform="translate(38 32) rotate(-24)">
        <path d="M0 -13C7 -7 7 7 0 13C-7 7 -7 -7 0 -13Z" fill="#6FBFA3" />
        <path d="M0 -13C-7 -7 -7 7 0 13Z" fill="#9AD4BF" />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Logo size={size * 1.1} />
      <span
        className="font-bold tracking-tight text-brand"
        style={{ fontSize: size, letterSpacing: "-0.04em" }}
      >
        pas
      </span>
    </span>
  );
}
