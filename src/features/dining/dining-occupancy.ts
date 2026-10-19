import type { TableStatus } from '@/shared/types/domain';

export const occupancyLabels: Record<TableStatus, string> = {
  available: 'Disponível',
  occupied: 'Ocupada',
  awaiting_bill: 'Aguardando conta',
  reserved: 'Reservada',
  unavailable: 'Indisponível',
};

export const occupancyShortLabel: Record<TableStatus, string> = {
  available: 'Livre',
  occupied: 'Ocupada',
  awaiting_bill: 'Conta',
  reserved: 'Reserva',
  unavailable: 'Fechada',
};

export const occupancyEdge: Record<TableStatus, string> = {
  available: 'border-success/70',
  occupied: 'border-primary',
  awaiting_bill: 'border-secondary',
  reserved: 'border-info',
  unavailable: 'border-dashed border-border',
};

export const occupancyChair: Record<TableStatus, string> = {
  available: 'bg-success/35',
  occupied: 'bg-primary/45',
  awaiting_bill: 'bg-secondary/40',
  reserved: 'bg-info/40',
  unavailable: 'bg-muted-foreground/25',
};

export const occupancyDot: Record<TableStatus, string> = {
  available: 'bg-success',
  occupied: 'bg-primary',
  awaiting_bill: 'bg-secondary',
  reserved: 'bg-info',
  unavailable: 'bg-muted-foreground',
};
