export function SabliMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 4c8 11 11 18 11 27a11 11 0 1 1-22 0c0-9 3-16 11-27z" fill="#FF5A3C" />
      <path
        d="M32 4c8 11 11 18 11 27a11 11 0 1 1-22 0c0-9 3-16 11-27z"
        fill="#6C4CF5"
        transform="rotate(90 32 32)"
      />
      <path
        d="M32 4c8 11 11 18 11 27a11 11 0 1 1-22 0c0-9 3-16 11-27z"
        fill="#B9F34A"
        transform="rotate(180 32 32)"
      />
      <path
        d="M32 4c8 11 11 18 11 27a11 11 0 1 1-22 0c0-9 3-16 11-27z"
        fill="#FF9A3C"
        transform="rotate(270 32 32)"
      />
      <circle cx="32" cy="32" r="8" fill="#FFF9F5" />
    </svg>
  );
}

export function SabliLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-foreground">
      <SabliMark className="size-10 shrink-0" />
      {compact ? (
        <span className="sr-only">sabli by Emilabs</span>
      ) : (
        <span className="grid leading-none">
          <span className="text-[22px] font-extrabold tracking-tight">sabli</span>
          <span className="text-[11px] font-bold text-muted-foreground">by Emilabs</span>
        </span>
      )}
    </span>
  );
}
