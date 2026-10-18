import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

const tones = {
  neutral: 'bg-muted text-foreground',
  coral: 'bg-primary-soft text-primary-strong',
  purple: 'bg-secondary-soft text-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent text-accent-foreground',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTones = {
  available: 'success',
  occupied: 'coral',
  awaiting_bill: 'purple',
  reserved: 'info',
  unavailable: 'neutral',
  aberto: 'info',
  'em preparo': 'purple',
  pronto: 'success',
  entregue: 'neutral',
  cancelado: 'danger',
} as const;

const statusLabels: Record<string, string> = {
  available: 'Disponível',
  occupied: 'Ocupada',
  awaiting_bill: 'Aguardando conta',
  reserved: 'Reservada',
  unavailable: 'Indisponível',
  aberto: 'Aberto',
  'em preparo': 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTones[status as keyof typeof statusTones] ?? 'neutral';
  return <Badge tone={tone}>{statusLabels[status] ?? status}</Badge>;
}
