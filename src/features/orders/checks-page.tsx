import { Banknote, Clock, Receipt } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { StatusBadge } from '@/design-system/components/badge';
import { Button } from '@/design-system/components/button';
import { Alert, EmptyState } from '@/design-system/components/feedback';
import { PageHeader } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { pushToast } from '@/design-system/components/toast';
import {
  OrderAmountBreakdown,
  OrderItemComposition,
} from '@/features/ordering/order-item-composition';
import { useOrdersQuery } from '@/shared/api/hooks';
import { elapsedLabel, formatDateTime } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import { saleItemTitle } from '@/shared/domain/order';
import {
  activeServiceFor,
  demoSession,
  ordersForService,
  paymentsForService,
  servicePaidCents,
  serviceRemainingCents,
  useDemoSession,
  type LiveTable,
  type LocalOrder,
  type TableService,
} from '@/shared/demo/session';
import { PAYMENT_METHOD_LABEL } from '@/shared/domain/bill';
import type { CatalogOrder } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

type CheckFilter = 'all' | 'occupied' | 'awaiting_bill';

const filterTitle: Record<CheckFilter, string> = {
  all: 'Abertas agora',
  occupied: 'Em atendimento',
  awaiting_bill: 'Aguardando conta',
};

function pad(number: number) {
  return String(number).padStart(2, '0');
}

function channelFor(number: number) {
  return `Mesa ${pad(number)}`;
}

function latestPreview(number: number, orders: CatalogOrder[]) {
  const channel = channelFor(number);
  const match = orders.find((order) => order.channel === channel && order.status !== 'cancelado');
  if (!match || match.items.length === 0) return null;
  const first = `${match.items[0].quantity}× ${saleItemTitle(match.items[0])}`;
  if (match.items.length === 1) return first;
  return `${first} · +${match.items.length - 1}`;
}

export function ChecksPage() {
  const session = useDemoSession();
  const ordersQuery = useOrdersQuery();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CheckFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(session.activeTableId);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1280px)');
    const apply = () => {
      setWide(query.matches);
      if (query.matches) setDetailOpen(false);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const orders = useMemo<CatalogOrder[]>(() => {
    const local = session.localOrders.map((order) => ({ ...order, status: order.status }));
    return [...local, ...(ordersQuery.data ?? [])];
  }, [ordersQuery.data, session.localOrders]);

  const openTables = useMemo(() => {
    return session.tables
      .filter((table) => table.status === 'occupied' || table.status === 'awaiting_bill')
      .sort((a, b) => {
        const rank = (table: LiveTable) => (table.status === 'awaiting_bill' ? 0 : 1);
        const byStatus = rank(a) - rank(b);
        if (byStatus !== 0) return byStatus;
        return b.billCents - a.billCents;
      });
  }, [session.tables]);

  const counts = useMemo(() => {
    const occupied = openTables.filter((table) => table.status === 'occupied').length;
    const awaiting = openTables.filter((table) => table.status === 'awaiting_bill').length;
    const openCents = openTables.reduce((sum, table) => sum + table.billCents, 0);
    return { occupied, awaiting, openCents };
  }, [openTables]);

  const visible =
    filter === 'all' ? openTables : openTables.filter((table) => table.status === filter);
  const selected = visible.find((table) => table.id === selectedId) ?? visible[0] ?? null;

  const applyFilter = (next: CheckFilter) => {
    setFilter((current) => (current === next ? 'all' : next));
  };

  const choose = (id: string) => {
    setSelectedId(id);
    if (!wide) setDetailOpen(true);
  };

  const addItems = (table: LiveTable) => {
    if (table.status === 'awaiting_bill') {
      pushToast({
        title: 'Reabra o atendimento para lançar itens',
        tone: 'danger',
      });
      return;
    }
    demoSession.selectTable(table.id);
    navigate('/pdv');
  };

  const goToCash = (table: LiveTable) => {
    demoSession.selectTable(table.id);
    navigate('/caixa');
  };

  const askBill = (table: LiveTable) => {
    const asked = demoSession.requestBill(table.id);
    if (asked) {
      pushToast({ title: `Conta da mesa ${pad(table.number)} pedida`, tone: 'success' });
    }
  };

  const reopen = (table: LiveTable) => {
    const ok = demoSession.reopenService(table.id);
    if (ok) pushToast({ title: 'Atendimento reaberto para novos itens' });
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Comandas"
        description="Contas abertas do salão. Peça a conta ou lance mais itens na mesa."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Em atendimento"
          value={String(counts.occupied)}
          icon={<Clock className="size-5" />}
          tone="bg-secondary text-secondary-foreground"
          active={filter === 'occupied'}
          onClick={() => applyFilter('occupied')}
        />
        <Stat
          label="Aguardando conta"
          value={String(counts.awaiting)}
          icon={<Receipt className="size-5" />}
          tone="bg-primary-action text-primary-action-foreground"
          active={filter === 'awaiting_bill'}
          onClick={() => applyFilter('awaiting_bill')}
        />
        <div className="flex items-center gap-3 rounded-[16px] border border-border/70 bg-card px-4 py-3 shadow-card">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-foreground text-background">
            <Banknote className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-muted-foreground">Em aberto</span>
            <span className="mt-0.5 block text-xl leading-none font-extrabold tabular-nums">
              {formatBRL(counts.openCents)}
            </span>
          </span>
        </div>
      </div>

      {openTables.length === 0 ? (
        <EmptyState
          title="Nenhuma comanda aberta"
          description="Quando uma mesa estiver em atendimento, a conta parcial aparece aqui."
        />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-card">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-extrabold">{filterTitle[filter]}</h2>
              <p className="text-xs font-bold text-muted-foreground">
                {visible.length} {visible.length === 1 ? 'mesa' : 'mesas'}
              </p>
            </header>
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
                Nenhuma mesa neste filtro.
              </p>
            ) : (
              <ul>
                {visible.map((table) => {
                  const awaiting = table.status === 'awaiting_bill';
                  const active = selected?.id === table.id;
                  const preview = latestPreview(table.number, orders);
                  return (
                    <li key={table.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(table.id)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                          active ? 'bg-muted' : 'hover:bg-muted/60',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-12 shrink-0 place-items-center rounded-[14px] text-sm font-extrabold tabular-nums',
                            awaiting
                              ? 'bg-primary-action text-primary-action-foreground'
                              : 'bg-secondary text-secondary-foreground',
                          )}
                        >
                          {pad(table.number)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-extrabold">Mesa {pad(table.number)}</span>
                            {awaiting ? (
                              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-extrabold text-primary-strong">
                                Conta
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                            {table.guests} {table.guests === 1 ? 'pessoa' : 'pessoas'} ·{' '}
                            {table.openedAt ? elapsedLabel(table.openedAt) : 'agora'}
                            {preview ? ` · ${preview}` : ''}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-base font-extrabold">
                          {formatBRL(table.billCents)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selected ? (
            <aside className="sticky top-20 hidden xl:block">
              <section className="rounded-[20px] border border-border/70 bg-card p-5 shadow-card">
                <CheckDetail
                  table={selected}
                  preview={latestPreview(selected.number, orders)}
                  service={activeServiceFor(session.services, selected.id)}
                  sessionOrders={sessionOrdersFor(selected, session.localOrders, session.services)}
                  onAdd={() => addItems(selected)}
                  onCash={() => goToCash(selected)}
                  onBill={() => askBill(selected)}
                  onReopen={() => reopen(selected)}
                />
              </section>
            </aside>
          ) : null}
        </div>
      )}

      <Sheet
        open={detailOpen && Boolean(selected) && !wide}
        onOpenChange={setDetailOpen}
        title={selected ? `Mesa ${pad(selected.number)}` : 'Comanda'}
        description={selected ? `${selected.guests} pessoas na mesa` : 'Conta parcial'}
      >
        {selected ? (
          <CheckDetail
            table={selected}
            preview={latestPreview(selected.number, orders)}
            service={activeServiceFor(session.services, selected.id)}
            sessionOrders={sessionOrdersFor(selected, session.localOrders, session.services)}
            onAdd={() => addItems(selected)}
            onCash={() => goToCash(selected)}
            onBill={() => askBill(selected)}
            onReopen={() => reopen(selected)}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function sessionOrdersFor(table: LiveTable, orders: LocalOrder[], services: TableService[]) {
  const service = activeServiceFor(services, table.id);
  if (service) return ordersForService(orders, service);
  const channel = channelFor(table.number);
  return orders.filter((order) => order.channel === channel && order.tableId === table.id);
}

function CheckDetail({
  table,
  preview,
  service,
  sessionOrders,
  onAdd,
  onCash,
  onBill,
  onReopen,
}: {
  table: LiveTable;
  preview: string | null;
  service?: TableService;
  sessionOrders: LocalOrder[];
  onAdd: () => void;
  onCash: () => void;
  onBill: () => void;
  onReopen: () => void;
}) {
  const session = useDemoSession();
  const awaiting = table.status === 'awaiting_bill';
  const seedCents = service?.seedBalanceCents ?? 0;
  const sessionTotal = sessionOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const payments = service ? paymentsForService(session.payments, service.id) : [];
  const paid = service ? servicePaidCents(session.payments, service.id) : 0;
  const remaining = service
    ? serviceRemainingCents(service, session.localOrders, session.payments)
    : table.billCents;
  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-muted-foreground">Mesa</p>
          <p className="mt-1 text-4xl leading-none font-extrabold tabular-nums">
            {pad(table.number)}
          </p>
        </div>
        <StatusBadge status={table.status} />
      </div>
      {awaiting && remaining > 0 ? (
        <Alert title="Conta pendente" tone="warning">
          A solicitação não quita a mesa. O histórico de consumo permanece até o encerramento no
          caixa.
        </Alert>
      ) : null}
      {awaiting && remaining === 0 ? (
        <Alert title="Conta quitada" tone="success">
          Encerre no caixa para liberar a mesa. Os pedidos não serão alterados.
        </Alert>
      ) : null}
      <div>
        <p className="text-xs font-bold text-muted-foreground">Total da conta</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatBRL(table.billCents)}</p>
        {awaiting ? (
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            Pago {formatBRL(paid)} · restante {formatBRL(remaining)}
          </p>
        ) : null}
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <Meta label="Pessoas" value={String(table.guests)} />
        <Meta label="Aberta" value={table.openedAt ? elapsedLabel(table.openedAt) : 'agora'} />
        <Meta label="Lugares" value={String(table.seats)} />
      </dl>
      {service ? (
        <dl className="grid grid-cols-2 gap-2">
          <Meta label="Responsável" value={service.hostName} />
          <Meta label="Abertura" value={formatDateTime(service.openedAt)} />
        </dl>
      ) : null}
      {service?.requestedBillAt ? (
        <p className="text-xs font-semibold text-muted-foreground">
          Conta solicitada em {formatDateTime(service.requestedBillAt)}
          {service.status === 'open' ? ' · atendimento reaberto para novos itens' : ''}
        </p>
      ) : null}
      {seedCents > 0 ? (
        <div className="rounded-[16px] bg-muted px-3 py-3">
          <p className="text-xs font-extrabold text-muted-foreground">
            Saldo demonstrativo anterior
          </p>
          <p className="mt-1 text-sm font-bold">
            Consumo de exemplo já registrado nesta mesa, sem itens detalhados nesta sessão.
          </p>
          <p className="tabular mt-2 text-base font-extrabold">{formatBRL(seedCents)}</p>
        </div>
      ) : null}
      {sessionOrders.length > 0 ? (
        <div className="grid gap-3">
          <div>
            <p className="text-xs font-extrabold text-muted-foreground">
              Pedidos deste atendimento
            </p>
            {seedCents > 0 ? (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Os novos pedidos somam ao saldo anterior. A conta não duplica itens.
              </p>
            ) : null}
          </div>
          {sessionOrders.map((order) => (
            <div key={order.id} className="grid gap-2 rounded-[16px] bg-muted px-3 py-3">
              <p className="text-sm font-extrabold">Pedido #{order.number}</p>
              <ul className="grid gap-2">
                {order.items.map((item, index) => (
                  <li key={item.lineId ?? `${item.name}-${index}`} className="flex gap-2 text-sm">
                    <span className="font-extrabold">{item.quantity}×</span>
                    <OrderItemComposition name={item.name} notes={item.notes} pizza={item.pizza} />
                  </li>
                ))}
              </ul>
              <OrderAmountBreakdown
                subtotalCents={order.subtotalCents}
                discountCents={order.discountCents}
                totalCents={order.totalCents}
              />
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold">
            <span>Pedidos desta sessão</span>
            <span className="tabular">{formatBRL(sessionTotal)}</span>
          </div>
        </div>
      ) : preview && seedCents === 0 ? (
        <div className="rounded-[16px] bg-muted px-3 py-3">
          <p className="text-xs font-extrabold text-muted-foreground">Último pedido</p>
          <p className="mt-1 text-sm font-bold">{preview}</p>
        </div>
      ) : null}
      {payments.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {payments.map((payment) => (
            <li key={payment.id} className="flex justify-between rounded-[12px] bg-muted px-3 py-2">
              <span className="font-bold">{PAYMENT_METHOD_LABEL[payment.method]}</span>
              <span className="tabular font-extrabold">{formatBRL(payment.appliedCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2">
        {awaiting ? (
          <>
            <Button onClick={onCash}>
              {remaining === 0 ? 'Encerrar no caixa' : 'Receber pagamento'}
            </Button>
            {payments.length === 0 ? (
              <Button variant="secondary" onClick={onReopen}>
                Reabrir atendimento
              </Button>
            ) : null}
          </>
        ) : (
          <Button onClick={onBill}>Pedir conta</Button>
        )}
        {awaiting ? (
          <p className="text-xs font-semibold text-muted-foreground">
            Adicionar itens fica bloqueado enquanto a conta estiver solicitada.
          </p>
        ) : (
          <Button variant="outline" onClick={onAdd}>
            Adicionar itens
          </Button>
        )}
        {awaiting ? null : (
          <Button variant="ghost" onClick={onCash}>
            Ir para o caixa
          </Button>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-muted px-2 py-2 text-center">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-[16px] border bg-card px-4 py-3 text-left shadow-card transition duration-150 hover:-translate-y-0.5 hover:shadow-pop motion-reduce:transform-none',
        active ? 'border-foreground' : 'border-border/70',
      )}
    >
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', tone)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted-foreground">{label}</span>
        <span className="mt-0.5 block text-xl leading-none font-extrabold tabular-nums">
          {value}
        </span>
      </span>
    </button>
  );
}
