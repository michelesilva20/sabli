import type { DiningMapTable } from '@/shared/api/dining';
import {
  occupancyChair,
  occupancyDot,
  occupancyEdge,
  occupancyLabels,
  occupancyShortLabel,
} from '@/features/dining/dining-occupancy';
import { elapsedLabel } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import type { TableStatus } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';
import type { ReactNode } from 'react';

function seatsAround(count: number) {
  if (count <= 2) {
    return ['top-1/2 left-0 h-6 w-2 -translate-y-1/2', 'top-1/2 right-0 h-6 w-2 -translate-y-1/2'];
  }
  if (count <= 4) {
    return [
      'top-0 left-1/2 h-2 w-6 -translate-x-1/2',
      'bottom-0 left-1/2 h-2 w-6 -translate-x-1/2',
      'top-1/2 left-0 h-6 w-2 -translate-y-1/2',
      'top-1/2 right-0 h-6 w-2 -translate-y-1/2',
    ];
  }
  return [
    'top-0 left-[16%] h-2 w-5',
    'top-0 left-1/2 h-2 w-5 -translate-x-1/2',
    'top-0 right-[16%] h-2 w-5',
    'bottom-0 left-[16%] h-2 w-5',
    'bottom-0 left-1/2 h-2 w-5 -translate-x-1/2',
    'bottom-0 right-[16%] h-2 w-5',
  ];
}

export function TableShape({
  table,
  selected,
  dimmed,
  onSelect,
}: {
  table: DiningMapTable;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const wide = table.seats > 4;
  const round = table.seats <= 2;
  const number = String(table.number).padStart(2, '0');
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Mesa ${number}, ${occupancyLabels[table.status]}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      style={{ left: `${table.x}%`, top: `${table.y}%`, opacity: dimmed ? 0.28 : 1 }}
    >
      <span
        className="relative grid place-items-center"
        style={{ width: wide ? 128 : round ? 86 : 98, height: wide ? 86 : 88 }}
      >
        {seatsAround(table.seats).map((place) => (
          <span
            key={place}
            aria-hidden
            className={cn('absolute rounded-full', occupancyChair[table.status], place)}
          />
        ))}
        <span
          className={cn(
            'relative flex h-16 flex-col items-center justify-center border-2 bg-card px-1.5 text-center shadow-card transition-shadow duration-200 hover:shadow-pop',
            wide
              ? 'w-[112px] rounded-[22px]'
              : round
                ? 'w-[80px] rounded-[20px]'
                : 'w-[76px] rounded-[18px]',
            occupancyEdge[table.status],
            table.status === 'unavailable' && 'bg-muted/80',
            selected && 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--primary)]',
          )}
        >
          <span className="text-[15px] leading-none font-extrabold tabular-nums">{number}</span>
          <span
            className={cn(
              'mt-0.5 max-w-full truncate text-[10px] leading-none font-extrabold tabular-nums',
              table.billCents > 0 ? 'text-primary-strong' : 'text-muted-foreground',
            )}
          >
            {table.billCents > 0 ? formatBRL(table.billCents) : occupancyShortLabel[table.status]}
          </span>
          {table.openedAt ? (
            <span className="mt-0.5 text-[10px] leading-none font-semibold text-muted-foreground">
              {elapsedLabel(table.openedAt)}
            </span>
          ) : null}
          {table.guests > 0 ? (
            <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-extrabold text-background">
              {table.guests}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function DiningSalon({
  title,
  subtitle,
  tables,
  selectedId,
  filter,
  onSelect,
}: {
  title: string;
  subtitle: ReactNode;
  tables: DiningMapTable[];
  selectedId: string | null;
  filter: 'all' | TableStatus;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="text-xs font-bold text-muted-foreground">{subtitle}</p>
      </div>
      <div className="relative mx-4 mb-4 h-[640px] min-w-[860px] overflow-hidden rounded-[20px] bg-[#f4f0ea] [background-image:radial-gradient(circle,#e4ddd4_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[#16141b] dark:[background-image:radial-gradient(circle,#2a2631_1px,transparent_1px)]">
        <div className="pointer-events-none absolute inset-x-16 top-0 h-7 border-x border-b border-info/30 bg-info-soft/80">
          <span className="absolute inset-x-0 -bottom-5 text-center text-[10px] font-extrabold tracking-[0.16em] text-muted-foreground uppercase">
            Janela
          </span>
        </div>
        <div className="pointer-events-none absolute top-14 right-3 bottom-14 w-1.5 rounded-full bg-foreground/10" />
        <span className="pointer-events-none absolute top-16 right-5 text-[10px] font-extrabold tracking-[0.16em] text-muted-foreground uppercase">
          Passagem
        </span>
        <div className="pointer-events-none absolute bottom-3 left-5 flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] text-muted-foreground uppercase">
          <span className="h-5 w-8 rounded-t-full border border-b-0 border-foreground/15" />
          Entrada
        </div>
        {tables.map((table) => (
          <TableShape
            key={table.id}
            table={table}
            selected={table.id === selectedId}
            dimmed={filter !== 'all' && table.status !== filter}
            onSelect={() => onSelect(table.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function DiningStatusFilters({
  filter,
  counts,
  onChange,
}: {
  filter: 'all' | TableStatus;
  counts: Record<TableStatus, number>;
  onChange: (value: 'all' | TableStatus) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Legenda de status">
      <li>
        <button
          type="button"
          onClick={() => onChange('all')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-extrabold',
            filter === 'all' ? 'border-foreground bg-foreground text-background' : 'border-border bg-card',
          )}
          aria-pressed={filter === 'all'}
        >
          Todas
        </button>
      </li>
      {(Object.keys(occupancyLabels) as TableStatus[]).map((status) => (
        <li key={status}>
          <button
            type="button"
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold',
              filter === status
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card',
            )}
            aria-pressed={filter === status}
          >
            <span className={cn('size-2 rounded-full', occupancyDot[status])} aria-hidden />
            {occupancyLabels[status]}
            <span className="tabular-nums opacity-70" aria-hidden>
              {counts[status]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
