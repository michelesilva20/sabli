import { Banknote, Check, Clock, Package } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { StatusBadge } from '@/design-system/components/badge';
import { DataTable } from '@/design-system/components/data-table';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader, Pagination } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import {
  OrderAmountBreakdown,
  OrderItemComposition,
} from '@/features/ordering/order-item-composition';
import { useOrdersQuery } from '@/shared/api/hooks';
import { formatDateTime, formatTime } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import { saleItemTitle } from '@/shared/domain/order';
import { useDemoSession } from '@/shared/demo/session';
import type { CatalogOrder } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const PAGE_SIZE = 6;

type OrderRow = CatalogOrder;
type StatusFilter = 'all' | CatalogOrder['status'];

const filters: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'em preparo', label: 'Em preparo' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'entregue', label: 'Entregues' },
  { id: 'cancelado', label: 'Cancelados' },
];

function itemSummary(items: OrderRow['items']) {
  if (items.length === 0) return 'Sem itens';
  const first = `${items[0].quantity}× ${saleItemTitle(items[0])}`;
  if (items.length === 1) return first;
  return `${first} · +${items.length - 1}`;
}

export function OrdersPage() {
  const query = useOrdersQuery();
  const session = useDemoSession();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const local: OrderRow[] = session.localOrders.map((order) => ({
      ...order,
      status: order.status,
    }));
    return [...local, ...(query.data ?? [])];
  }, [query.data, session.localOrders]);

  const counts = useMemo(() => {
    const by = (status: CatalogOrder['status']) =>
      rows.filter((row) => row.status === status).length;
    const movement = rows
      .filter((row) => row.status !== 'cancelado')
      .reduce((sum, row) => sum + row.totalCents, 0);
    return {
      preparing: by('em preparo'),
      ready: by('pronto'),
      delivered: by('entregue'),
      movement,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (!term) return true;
      const haystack = [row.number, row.channel, ...row.items.map((item) => item.name)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const current = rows.find((row) => row.id === selected) ?? null;

  const applyFilter = (next: StatusFilter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pedidos"
        description="Acompanhe o que está na cozinha, o que está pronto e o que já saiu."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Em preparo"
          value={String(counts.preparing)}
          icon={<Clock className="size-5" />}
          tone="bg-secondary text-secondary-foreground"
          active={filter === 'em preparo'}
          onClick={() => applyFilter(filter === 'em preparo' ? 'all' : 'em preparo')}
        />
        <Stat
          label="Prontos"
          value={String(counts.ready)}
          icon={<Check className="size-5" />}
          tone="bg-accent text-accent-foreground"
          active={filter === 'pronto'}
          onClick={() => applyFilter(filter === 'pronto' ? 'all' : 'pronto')}
        />
        <Stat
          label="Entregues"
          value={String(counts.delivered)}
          icon={<Package className="size-5" />}
          tone="bg-foreground text-background"
          active={filter === 'entregue'}
          onClick={() => applyFilter(filter === 'entregue' ? 'all' : 'entregue')}
        />
        <div className="flex items-center gap-3 rounded-[16px] border border-border/70 bg-card px-4 py-3 shadow-card">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary-action text-primary-action-foreground">
            <Banknote className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-muted-foreground">Movimento</span>
            <span className="mt-0.5 block text-xl leading-none font-extrabold tabular-nums">
              {formatBRL(counts.movement)}
            </span>
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center">
          <ul className="flex flex-wrap gap-2" aria-label="Filtrar por status">
            {filters.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => applyFilter(item.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-extrabold',
                    filter === item.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card',
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 lg:ml-auto">
            <p className="shrink-0 text-xs font-bold text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'pedido' : 'pedidos'}
            </p>
            <SearchInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar pedido, mesa ou item"
              aria-label="Buscar pedidos"
              className="w-full sm:w-64 [&_input]:h-10 [&_input]:rounded-full [&_input]:bg-muted"
            />
          </div>
        </div>
        <DataTable
          bare
          caption="Pedidos"
          rows={visible}
          getRowId={(row) => row.id}
          onRowClick={(row) => setSelected(row.id)}
          emptyTitle="Nenhum pedido neste filtro"
          emptyDescription="Troque o status ou limpe a busca para ver o movimento da sessão."
          columns={[
            {
              id: 'number',
              header: 'Pedido',
              cell: (row) => (
                <span className="block min-w-0">
                  <span className="block font-extrabold">#{row.number}</span>
                  <span className="block max-w-56 truncate text-xs font-semibold text-muted-foreground">
                    {itemSummary(row.items)}
                  </span>
                </span>
              ),
            },
            {
              id: 'channel',
              header: 'Origem',
              cell: (row) => <span className="font-bold">{row.channel}</span>,
            },
            { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
            {
              id: 'when',
              header: 'Quando',
              cell: (row) => (
                <span className="block">
                  <span className="block tabular font-bold">
                    {formatTime(new Date(row.openedAt))}
                  </span>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
                      new Date(row.openedAt),
                    )}
                  </span>
                </span>
              ),
            },
            {
              id: 'total',
              header: 'Total',
              className: 'text-right',
              cell: (row) => (
                <span className="tabular text-base font-extrabold">
                  {formatBRL(row.totalCents)}
                </span>
              ),
            },
          ]}
        />
        {pageCount > 1 ? (
          <footer className="border-t border-border px-4 py-3">
            <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
          </footer>
        ) : null}
      </section>

      <Sheet
        open={Boolean(current)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={current ? `Pedido #${current.number}` : 'Pedido'}
        description={
          current ? `${current.channel} · ${formatDateTime(current.openedAt)}` : 'Detalhe'
        }
      >
        {current ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={current.status} />
              {current.subtotalCents === undefined ? (
                <p className="tabular text-2xl font-extrabold">{formatBRL(current.totalCents)}</p>
              ) : null}
            </div>
            <ul className="divide-y divide-border rounded-[16px] border border-border">
              {current.items.map((item, index) => (
                <li
                  key={item.lineId ?? `${item.name}-${index}`}
                  className="flex items-start justify-between gap-3 px-3 py-3 text-sm"
                >
                  <div className="flex min-w-0 gap-2">
                    <span className="font-extrabold">{item.quantity}×</span>
                    <OrderItemComposition name={item.name} notes={item.notes} pizza={item.pizza} />
                  </div>
                  <span className="tabular font-bold">{formatBRL(item.totalCents)}</span>
                </li>
              ))}
            </ul>
            {current.subtotalCents !== undefined ? (
              <OrderAmountBreakdown
                subtotalCents={current.subtotalCents}
                discountCents={current.discountCents ?? 0}
                totalCents={current.totalCents}
              />
            ) : null}
          </div>
        ) : null}
      </Sheet>
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
