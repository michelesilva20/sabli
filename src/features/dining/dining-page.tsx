import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Banner } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Dialog } from '@/design-system/components/dialog';
import { NumberInput } from '@/design-system/components/number-input';
import { PageHeader, SegmentedControl } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { StatusBadge } from '@/design-system/components/badge';
import { pushToast } from '@/design-system/components/toast';
import {
  activeServiceFor,
  demoSession,
  paymentsForService,
  serviceRemainingCents,
  useDemoSession,
  type LiveTable,
} from '@/shared/demo/session';
import { elapsedLabel, formatDateTime } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import type { TableStatus } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const labels: Record<TableStatus, string> = {
  available: 'Disponível',
  occupied: 'Ocupada',
  awaiting_bill: 'Aguardando conta',
  reserved: 'Reservada',
  unavailable: 'Indisponível',
};

const shortLabel: Record<TableStatus, string> = {
  available: 'Livre',
  occupied: 'Ocupada',
  awaiting_bill: 'Conta',
  reserved: 'Reserva',
  unavailable: 'Fechada',
};

const edge: Record<TableStatus, string> = {
  available: 'border-success/70',
  occupied: 'border-primary',
  awaiting_bill: 'border-secondary',
  reserved: 'border-info',
  unavailable: 'border-dashed border-border',
};

const chair: Record<TableStatus, string> = {
  available: 'bg-success/35',
  occupied: 'bg-primary/45',
  awaiting_bill: 'bg-secondary/40',
  reserved: 'bg-info/40',
  unavailable: 'bg-muted-foreground/25',
};

const dot: Record<TableStatus, string> = {
  available: 'bg-success',
  occupied: 'bg-primary',
  awaiting_bill: 'bg-secondary',
  reserved: 'bg-info',
  unavailable: 'bg-muted-foreground',
};

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

function TableShape({
  table,
  selected,
  dimmed,
  onSelect,
}: {
  table: LiveTable;
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
      aria-label={`Mesa ${number}, ${labels[table.status]}`}
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
            className={cn('absolute rounded-full', chair[table.status], place)}
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
            edge[table.status],
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
            {table.billCents > 0 ? formatBRL(table.billCents) : shortLabel[table.status]}
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

export function DiningPage() {
  const session = useDemoSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [filter, setFilter] = useState<'all' | TableStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(session.activeTableId);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [guests, setGuests] = useState(2);
  const [cashBlock, setCashBlock] = useState(false);
  const tables = useMemo(
    () => session.tables.filter((table) => filter === 'all' || table.status === filter),
    [filter, session.tables],
  );
  const serving = session.tables.filter(
    (table) => table.status === 'occupied' || table.status === 'awaiting_bill',
  ).length;
  const openBill = session.tables.reduce((sum, table) => sum + table.billCents, 0);
  const selected = session.tables.find((table) => table.id === selectedId) ?? null;
  const selectedService = activeServiceFor(session.services, selected?.id);
  const selectedRemaining = selectedService
    ? serviceRemainingCents(selectedService, session.localOrders, session.payments)
    : 0;
  const hasPayments = selectedService
    ? paymentsForService(session.payments, selectedService.id).length > 0
    : false;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Mapa de mesas"
        description="Toque uma mesa para abrir o atendimento, lançar um pedido ou pedir a conta."
        actions={
          <>
            <SegmentedControl
              label="Visualização"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'map', label: 'Mapa' },
                { id: 'list', label: 'Lista' },
              ]}
            />
            <Button variant="secondary" onClick={() => setReserveOpen(true)}>
              Nova reserva
            </Button>
          </>
        }
      />
      <ul className="flex flex-wrap gap-2" aria-label="Legenda de status">
        <li>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-extrabold',
              filter === 'all'
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card',
            )}
            aria-pressed={filter === 'all'}
          >
            Todas
          </button>
        </li>
        {(Object.keys(labels) as TableStatus[]).map((status) => (
          <li key={status}>
            <button
              type="button"
              onClick={() => setFilter(status)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold',
                filter === status
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card',
              )}
              aria-pressed={filter === status}
            >
              <span className={cn('size-2 rounded-full', dot[status])} aria-hidden />
              {labels[status]}
            </button>
          </li>
        ))}
      </ul>
      {mode === 'map' ? (
        <div className="overflow-x-auto rounded-[24px] border border-border bg-card shadow-card">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <p className="text-sm font-extrabold">Salão principal</p>
            <p className="text-xs font-bold text-muted-foreground">
              {serving} em atendimento
              <span className="px-2">·</span>
              <span className="tabular">{formatBRL(openBill)} em aberto</span>
            </p>
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
            {session.tables.map((table) => (
              <TableShape
                key={table.id}
                table={table}
                selected={table.id === selectedId}
                dimmed={filter !== 'all' && table.status !== filter}
                onSelect={() => {
                  setSelectedId(table.id);
                  setCashBlock(false);
                  demoSession.selectTable(table.id);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <li key={table.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(table.id);
                  setCashBlock(false);
                  demoSession.selectTable(table.id);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[16px] border border-border bg-card p-3 text-left shadow-card transition-shadow duration-200 hover:shadow-pop',
                  table.id === selectedId && 'ring-2 ring-primary',
                )}
              >
                <span
                  className={cn(
                    'grid size-12 shrink-0 place-items-center rounded-[14px] border-2 bg-card text-sm font-extrabold tabular-nums',
                    edge[table.status],
                  )}
                >
                  {String(table.number).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">
                    Mesa {String(table.number).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {table.guests > 0 ? `${table.guests} pessoas` : `${table.seats} lugares`}
                    {' · '}
                    {table.billCents ? formatBRL(table.billCents) : 'sem consumo'}
                    {table.openedAt ? ` · ${elapsedLabel(table.openedAt)}` : ''}
                  </span>
                </span>
                <StatusBadge status={table.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={selected ? `Mesa ${String(selected.number).padStart(2, '0')}` : 'Mesa'}
        description="Detalhes do atendimento demonstrativo"
      >
        {selected ? (
          <div className="grid gap-4">
            <StatusBadge status={selected.status} />
            {selected.status === 'unavailable' ? (
              <Alert title="Mesa indisponível" tone="warning">
                Esta mesa não pode ser aberta sem uma transição operacional válida.
              </Alert>
            ) : null}
            {selected.status === 'reserved' ? (
              <Alert title="Mesa reservada">
                Abrir o atendimento ocupa a reserva de forma explícita nesta demonstração.
              </Alert>
            ) : null}
            {selected.status === 'awaiting_bill' ? (
              <Alert title="Conta solicitada" tone="warning">
                A mesa aguarda pagamento. Caixa aberto não quita sozinho. Novos itens exigem reabrir
                o atendimento, se ainda não houver pagamento.
              </Alert>
            ) : null}
            {cashBlock ? (
              <Alert title="Conta não quitada" tone="warning">
                Quite o saldo restante no caixa antes de liberar a mesa.
              </Alert>
            ) : null}
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt>Lugares</dt>
                <dd className="font-bold">{selected.seats}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Pessoas</dt>
                <dd className="font-bold">{selected.guests}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Conta parcial</dt>
                <dd className="tabular font-extrabold">{formatBRL(selected.billCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tempo</dt>
                <dd>{selected.openedAt ? elapsedLabel(selected.openedAt) : '—'}</dd>
              </div>
              {selectedService ? (
                <>
                  <div className="flex justify-between">
                    <dt>Abertura</dt>
                    <dd>{formatDateTime(selectedService.openedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Responsável</dt>
                    <dd className="font-bold">{selectedService.hostName}</dd>
                  </div>
                </>
              ) : null}
              {selectedService?.requestedBillAt ? (
                <div className="flex justify-between">
                  <dt>Conta pedida</dt>
                  <dd>{formatDateTime(selectedService.requestedBillAt)}</dd>
                </div>
              ) : null}
              {selected?.status === 'awaiting_bill' ? (
                <div className="flex justify-between">
                  <dt>Saldo restante</dt>
                  <dd className="tabular font-extrabold">{formatBRL(selectedRemaining)}</dd>
                </div>
              ) : null}
            </dl>
            {(selected.status === 'available' || selected.status === 'reserved') && (
              <label className="grid gap-1 text-sm font-bold">
                Pessoas neste atendimento
                <NumberInput
                  value={guests}
                  min={1}
                  max={selected.seats}
                  onChange={(event) => setGuests(Number(event.target.value))}
                />
              </label>
            )}
            <div className="grid gap-2">
              {(selected.status === 'available' || selected.status === 'reserved') && (
                <Button
                  onClick={() => {
                    const opened = demoSession.openTable(selected.id, guests);
                    if (!opened) {
                      pushToast({
                        title: 'Atendimento já ativo nesta mesa',
                        tone: 'danger',
                      });
                      return;
                    }
                    setCashBlock(false);
                    navigate('/pdv');
                  }}
                >
                  Abrir atendimento
                </Button>
              )}
              {selected.status === 'occupied' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const asked = demoSession.requestBill(selected.id);
                    if (asked) {
                      pushToast({
                        title: `Conta da mesa ${String(selected.number).padStart(2, '0')} pedida`,
                        tone: 'success',
                      });
                    }
                  }}
                >
                  Pedir conta
                </Button>
              ) : null}
              {selected.status === 'awaiting_bill' && !hasPayments ? (
                <Button
                  onClick={() => {
                    const ok = demoSession.reopenService(selected.id);
                    if (ok) pushToast({ title: 'Atendimento reaberto para novos itens' });
                  }}
                >
                  Reabrir atendimento
                </Button>
              ) : null}
              {selected.status === 'occupied' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    demoSession.selectTable(selected.id);
                    navigate('/pdv');
                  }}
                >
                  Adicionar itens
                </Button>
              ) : null}
              {selected.status === 'awaiting_bill' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      demoSession.selectTable(selected.id);
                      navigate('/caixa');
                    }}
                  >
                    Ir para o caixa
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const result = demoSession.closeService(selected.id);
                      if (result.ok) {
                        setCashBlock(false);
                        setSelectedId(null);
                        pushToast({
                          title: `Mesa ${String(selected.number).padStart(2, '0')} liberada`,
                          tone: 'success',
                        });
                        return;
                      }
                      if (result.reason === 'unpaid') {
                        setCashBlock(true);
                        return;
                      }
                      pushToast({
                        title: 'Encerramento bloqueado',
                        description: 'A mesa só é liberada com a conta solicitada e quitada.',
                        tone: 'danger',
                      });
                    }}
                  >
                    Encerrar atendimento
                  </Button>
                </>
              ) : null}
              <Button variant="ghost" onClick={() => navigate('/comandas')}>
                Ver comandas
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
      <Dialog
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        title="Reservas nesta fase"
        description="O fluxo completo de reservas não faz parte desta fundação."
        footer={<Button onClick={() => setReserveOpen(false)}>Entendi</Button>}
      >
        <Banner>
          Mesas já marcadas como reservadas continuam visíveis no mapa. Criar, confirmar ou cancelar
          reservas será responsabilidade da API Java.
        </Banner>
      </Dialog>
    </div>
  );
}
