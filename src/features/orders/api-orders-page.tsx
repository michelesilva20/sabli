import { Check, Clock, Hourglass, Package } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { StatusBadge } from '@/design-system/components/badge';
import { Button } from '@/design-system/components/button';
import { DataTable } from '@/design-system/components/data-table';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader, Pagination } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { OrderAmountBreakdown, OrderItemComposition } from '@/features/ordering/order-item-composition';
import { ApiError } from '@/shared/api/http-client';
import {
  channelLabel,
  productionToKitchen,
  type OrderResponse,
  type OrderSummary,
  type ProductionStatus,
} from '@/shared/api/orders';
import { useOrderQuery, useOrdersQuery } from '@/shared/api/orders-queries';
import { formatDateTime } from '@/shared/domain/date';
import { kitchenStatusToOrderStatus } from '@/shared/domain/kitchen';
import { formatBRL } from '@/shared/domain/money';
import { cn } from '@/shared/utils/cn';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | ProductionStatus;

const filters: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'WAITING', label: 'Aguardando' },
  { id: 'PREPARING', label: 'Em preparo' },
  { id: 'READY', label: 'Prontos' },
  { id: 'DELIVERED', label: 'Entregues' },
];

export function ApiOrdersPage() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const list = useOrdersQuery({
    productionStatus: filter === 'all' ? undefined : filter,
    page,
    size: PAGE_SIZE,
  });
  const detail = useOrderQuery(selected);
  const rows = useMemo(() => list.data?.items ?? [], [list.data?.items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [`#${row.number}`, channelLabel(row.channel), row.placedByName].join(' ').toLowerCase().includes(term),
    );
  }, [rows, search]);
  const pageCount = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const current = detail.data ?? null;
  const error =
    list.error instanceof ApiError && list.error.code === 'TENANT_SUSPENDED'
      ? 'Estabelecimento suspenso.'
      : list.error instanceof ApiError && list.error.status === 403
        ? 'Acesso negado aos pedidos deste estabelecimento.'
        : list.isError
          ? 'Não foi possível carregar os pedidos.'
          : null;

  function applyFilter(next: StatusFilter) {
    setFilter(next);
    setPage(0);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pedidos"
        description="Lista persistida deste estabelecimento. A atualização periódica pausa com a aba em segundo plano."
      />
      {error ? (
        <EmptyState
          title={error}
          description="Nenhum fixture de demonstração é usado como fallback."
          action={
            <Button variant="outline" onClick={() => void list.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Aguardando"
          value={countLabel(rows, 'WAITING')}
          icon={<Hourglass className="size-5" />}
          tone="bg-info-soft text-info"
          active={filter === 'WAITING'}
          onClick={() => applyFilter(filter === 'WAITING' ? 'all' : 'WAITING')}
        />
        <Stat
          label="Em preparo"
          value={countLabel(rows, 'PREPARING')}
          icon={<Clock className="size-5" />}
          tone="bg-secondary text-secondary-foreground"
          active={filter === 'PREPARING'}
          onClick={() => applyFilter(filter === 'PREPARING' ? 'all' : 'PREPARING')}
        />
        <Stat
          label="Prontos"
          value={countLabel(rows, 'READY')}
          icon={<Check className="size-5" />}
          tone="bg-accent text-accent-foreground"
          active={filter === 'READY'}
          onClick={() => applyFilter(filter === 'READY' ? 'all' : 'READY')}
        />
        <Stat
          label="Entregues"
          value={countLabel(rows, 'DELIVERED')}
          icon={<Package className="size-5" />}
          tone="bg-muted text-muted-foreground"
          active={filter === 'DELIVERED'}
          onClick={() => applyFilter(filter === 'DELIVERED' ? 'all' : 'DELIVERED')}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-extrabold',
              filter === item.id ? 'bg-foreground text-background' : 'border border-border bg-card',
            )}
            onClick={() => applyFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar número, canal ou responsável"
        aria-label="Buscar pedidos"
      />
      {list.isLoading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 && !error ? (
        <EmptyState title="Nenhum pedido" description="Confirme um pedido no PDV para vê-lo aqui." />
      ) : (
        <section className="overflow-hidden rounded-[20px] border border-border bg-card">
          <DataTable
            rows={filtered}
            getRowId={(row) => row.id}
            onRowClick={(row) => setSelected(row.id)}
            columns={[
              {
                id: 'number',
                header: 'Pedido',
                cell: (row) => <span className="font-extrabold">#{row.number}</span>,
              },
              {
                id: 'channel',
                header: 'Canal',
                cell: (row) => channelLabel(row.channel),
              },
              {
                id: 'status',
                header: 'Produção',
                cell: (row) => <StatusBadge status={kitchenStatusToOrderStatus(productionToKitchen(row.productionStatus))} />,
              },
              {
                id: 'when',
                header: 'Quando',
                cell: (row) => formatDateTime(row.placedAt),
              },
              {
                id: 'total',
                header: 'Total',
                className: 'text-right',
                cell: (row) => <span className="tabular text-base font-extrabold">{formatBRL(row.totalCents)}</span>,
              },
            ]}
          />
          {pageCount > 1 ? (
            <footer className="border-t border-border px-4 py-3">
              <Pagination page={page + 1} pageCount={pageCount} onPageChange={(next) => setPage(next - 1)} />
            </footer>
          ) : null}
        </section>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={current ? `Pedido #${current.number}` : 'Pedido'}
        description={current ? `${channelLabel(current.channel)} · ${formatDateTime(current.placedAt)}` : 'Detalhe persistido'}
      >
        {detail.isLoading ? (
          <Skeleton className="h-40" />
        ) : detail.isError ? (
          <Alert title="Não foi possível carregar o detalhe" tone="warning">
            O servidor é a fonte da verdade. Tente de novo.
          </Alert>
        ) : current ? (
          <OrderDetail order={current} />
        ) : null}
      </Sheet>
    </div>
  );
}

function OrderDetail({ order }: { order: OrderResponse }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={kitchenStatusToOrderStatus(productionToKitchen(order.productionStatus))} />
        <p className="text-xs font-bold text-muted-foreground">{order.commercialStatus === 'CONFIRMED' ? 'Confirmado' : order.commercialStatus}</p>
      </div>
      <ul className="divide-y divide-border rounded-[16px] border border-border">
        {order.items.map((item) => {
          const sale = {
            name: item.productName ?? 'Item',
            notes: item.notes ?? undefined,
            pizza: item.pizza
              ? {
                  sizeId: item.pizza.sizeId,
                  sizeName: item.pizza.sizeName,
                  flavors: item.pizza.flavors.map((flavor) => ({
                    id: flavor.flavorId,
                    name: flavor.name,
                    numerator: flavor.numerator,
                    denominator: flavor.denominator,
                  })),
                  crust: item.pizza.crust ?? { id: item.pizza.sizeId, name: 'tradicional', priceCents: 0 },
                  extras: item.pizza.extras,
                }
              : undefined,
          };
          return (
            <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
              <div className="flex min-w-0 gap-2">
                <span className="font-extrabold">{item.quantity}×</span>
                <div className="grid min-w-0 gap-1">
                  <OrderItemComposition name={sale.name} notes={sale.notes} pizza={sale.pizza} />
                  <StatusBadge status={kitchenStatusToOrderStatus(productionToKitchen(item.productionStatus))} />
                </div>
              </div>
              <span className="tabular font-bold">{formatBRL(item.lineTotalCents)}</span>
            </li>
          );
        })}
      </ul>
      <OrderAmountBreakdown
        subtotalCents={order.subtotalCents}
        discountCents={order.discountCents}
        totalCents={order.totalCents}
      />
    </div>
  );
}

function countLabel(rows: OrderSummary[], status: ProductionStatus) {
  return String(rows.filter((row) => row.productionStatus === status).length);
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
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', tone)}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted-foreground">{label}</span>
        <span className="mt-0.5 block text-xl leading-none font-extrabold tabular-nums">{value}</span>
      </span>
    </button>
  );
}
