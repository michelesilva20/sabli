import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiDiningPage } from '@/features/dining/api-dining-page';
import { DiningSalon, DiningStatusFilters } from '@/features/dining/dining-map';
import { occupancyEdge } from '@/features/dining/dining-occupancy';
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
} from '@/shared/demo/session';
import { isApiMode } from '@/shared/config/runtime';
import { elapsedLabel, formatDateTime } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import type { TableStatus } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

export function DiningPage() {
  if (isApiMode()) return <ApiDiningPage />;
  return <DemoDiningPage />;
}

function DemoDiningPage() {
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
  const counts = useMemo(() => {
    const next = {
      available: 0,
      occupied: 0,
      awaiting_bill: 0,
      reserved: 0,
      unavailable: 0,
    } satisfies Record<TableStatus, number>;
    for (const table of session.tables) next[table.status] += 1;
    return next;
  }, [session.tables]);

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
      <DiningStatusFilters filter={filter} counts={counts} onChange={setFilter} />
      {mode === 'map' ? (
        <DiningSalon
          title="Salão principal"
          subtitle={
            <>
              {serving} em atendimento
              <span className="px-2">·</span>
              <span className="tabular">{formatBRL(openBill)} em aberto</span>
            </>
          }
          tables={session.tables}
          selectedId={selectedId}
          filter={filter}
          onSelect={(id) => {
            setSelectedId(id);
            setCashBlock(false);
            demoSession.selectTable(id);
          }}
        />
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
                    occupancyEdge[table.status],
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
