import { Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

const alertTones = {
  info: 'border-info/30 bg-info-soft text-info',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  danger: 'border-danger/30 bg-danger-soft text-danger',
  success: 'border-success/30 bg-success-soft text-success',
};

export function Alert({
  title,
  children,
  tone = 'info',
}: {
  title: string;
  children?: ReactNode;
  tone?: keyof typeof alertTones;
}) {
  const Icon = tone === 'warning' || tone === 'danger' ? TriangleAlert : Info;
  return (
    <div
      role="status"
      className={cn('flex gap-3 rounded-[16px] border px-4 py-3', alertTones[tone])}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="text-sm font-extrabold">{title}</p>
        {children ? <div className="mt-1 text-sm font-semibold opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[16px] border border-primary/20 bg-primary-soft px-4 py-3 text-sm font-bold text-primary-strong">
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[12px] bg-muted motion-reduce:animate-none', className)}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[20px] border border-dashed border-border bg-card px-6 py-12 text-center">
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="tabular">{safe}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary-action" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export function Separator() {
  return <hr className="border-0 border-t border-border" />;
}

export function LoadingOverlay({ label = 'Carregando' }: { label?: string }) {
  return (
    <div
      role="status"
      className="absolute inset-0 z-20 grid place-items-center rounded-[20px] bg-background/70"
    >
      <p className="text-sm font-extrabold">{label}</p>
    </div>
  );
}
