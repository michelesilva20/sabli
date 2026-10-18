import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CatalogProductsState } from '@/features/catalog/catalog-products-state';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { PizzaBuilder } from '@/features/pizza-builder/pizza-builder';
import {
  OrderAmountBreakdown,
  OrderItemComposition,
} from '@/features/ordering/order-item-composition';
import { OrderSummary } from '@/features/ordering/order-summary';
import { useCatalogQuery } from '@/shared/api/hooks';
import { demoSession, selectOrderTotals, useDemoSession } from '@/shared/demo/session';
import { Button } from '@/design-system/components/button';
import { Drawer } from '@/design-system/components/sheet';
import { SearchInput } from '@/design-system/components/input';
import { QuantityInput } from '@/design-system/components/number-input';
import { StatusBadge } from '@/design-system/components/badge';
import { EmptyState } from '@/design-system/components/feedback';
import { pushToast } from '@/design-system/components/toast';
import { splitBill } from '@/shared/domain/bill';
import { formatBRL } from '@/shared/domain/money';
import { elapsedLabel } from '@/shared/domain/date';
import type { TableStatus } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const labels: Record<TableStatus, string> = {
  available: 'disponível',
  occupied: 'ocupada',
  awaiting_bill: 'aguardando conta',
  reserved: 'reservada',
  unavailable: 'indisponível',
};

const tone: Record<TableStatus, string> = {
  available: 'bg-[#E5F8D8] text-[#166534]',
  occupied: 'bg-[#FFE4DC] text-[#9A3412]',
  awaiting_bill: 'bg-[#EFEAFF] text-[#4C1D95]',
  reserved: 'bg-[#E3EEFF] text-[#1E3A8A]',
  unavailable: 'bg-[#F1EFED] text-[#44403C]',
};

export function WaiterTablesPage() {
  const session = useDemoSession();
  const navigate = useNavigate();
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Mesas</h1>
      <ul className="grid grid-cols-3 gap-3">
        {session.tables.map((table) => (
          <li key={table.id}>
            <button
              type="button"
              onClick={() => navigate(`/atendimento/mesas/${table.id}`)}
              className={cn(
                'grid min-h-24 w-full place-items-center rounded-[18px] text-lg font-extrabold',
                tone[table.status],
              )}
              aria-label={`Mesa ${table.number}, ${labels[table.status]}`}
            >
              {String(table.number).padStart(2, '0')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WaiterTablePage() {
  const { tableId = '' } = useParams();
  const session = useDemoSession();
  const navigate = useNavigate();
  const table = session.tables.find((item) => item.id === tableId);
  const [guests, setGuests] = useState(2);
  if (!table)
    return <EmptyState title="Mesa não encontrada" description="Volte ao mapa do atendimento." />;
  return (
    <div className="grid gap-4">
      <button
        type="button"
        className="text-left text-sm font-bold text-primary-strong"
        onClick={() => navigate('/atendimento/mesas')}
      >
        Voltar às mesas
      </button>
      <h1 className="text-3xl font-extrabold">Mesa {String(table.number).padStart(2, '0')}</h1>
      <StatusBadge status={table.status} />
      <p className="text-sm text-muted-foreground">
        {table.seats} lugares · {table.openedAt ? elapsedLabel(table.openedAt) : 'sem atendimento'}
      </p>
      <p className="tabular text-3xl font-extrabold">{formatBRL(table.billCents)}</p>
      {table.status === 'available' || table.status === 'reserved' ? (
        <div className="flex items-center justify-between">
          <span className="font-bold">Pessoas</span>
          <QuantityInput
            value={guests}
            min={1}
            max={table.seats}
            label="pessoas"
            onChange={setGuests}
          />
        </div>
      ) : null}
      {table.status === 'awaiting_bill' ? (
        <Button
          size="lg"
          onClick={() => {
            demoSession.reopenService(table.id);
            navigate('/atendimento/cardapio');
          }}
        >
          Reabrir e lançar itens
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={() => {
            if (table.status === 'available' || table.status === 'reserved')
              demoSession.openTable(table.id, guests);
            else demoSession.selectTable(table.id);
            navigate('/atendimento/cardapio');
          }}
        >
          Lançar itens
        </Button>
      )}
      <Button size="lg" variant="outline" onClick={() => navigate('/atendimento/comanda')}>
        Ver comanda
      </Button>
    </div>
  );
}

export function WaiterCheckPage() {
  const session = useDemoSession();
  const table = session.tables.find((item) => item.id === session.activeTableId);
  const orders = session.localOrders.filter((order) =>
    table ? order.channel.includes(String(table.number).padStart(2, '0')) : true,
  );
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">
        {table ? `Comanda da mesa ${String(table.number).padStart(2, '0')}` : 'Comanda do balcão'}
      </h1>
      <p className="tabular text-3xl font-extrabold">{formatBRL(table?.billCents ?? 0)}</p>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há pedidos enviados nesta sessão para esta origem.
        </p>
      ) : (
        <ul className="grid gap-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-[16px] bg-card p-4 shadow-card">
              <p className="font-extrabold">Pedido #{order.number}</p>
              <ul className="mt-2 grid gap-2 text-sm">
                {order.items.map((item, index) => (
                  <li key={item.lineId ?? `${item.name}-${index}`} className="flex gap-2">
                    <span className="font-extrabold">{item.quantity}×</span>
                    <OrderItemComposition name={item.name} notes={item.notes} pizza={item.pizza} />
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <OrderAmountBreakdown
                  subtotalCents={order.subtotalCents}
                  discountCents={order.discountCents}
                  totalCents={order.totalCents}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WaiterCatalogPage() {
  const catalog = useCatalogQuery();
  const session = useDemoSession();
  const navigate = useNavigate();
  const [category, setCategory] = useState('pizzas');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (catalog.data?.products ?? []).filter((product) => {
      const matches = !term || product.name.toLowerCase().includes(term);
      return matches && (term ? true : product.categoryId === category);
    });
  }, [catalog.data?.products, category, search]);
  const totals = selectOrderTotals(session);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Cardápio</h1>
        <Button size="sm" variant="secondary" onClick={() => navigate('/atendimento/montar-pizza')}>
          Pizza
        </Button>
      </div>
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Buscar produto"
        placeholder="Buscar"
      />
      {!search ? (
        <ProductCategoryTabs
          categories={catalog.data?.categories ?? []}
          value={category}
          onChange={setCategory}
        />
      ) : null}
      <CatalogProductsState
        catalog={catalog}
        visibleCount={products.length}
        search={search}
        onClearSearch={() => setSearch('')}
      >
        <div className="grid gap-3">
          {products.map((product) => (
            <ProductCatalogCard
              key={product.id}
              product={product}
              available={session.availability[product.id] !== false}
              onAdd={() => {
                demoSession.addProduct(product);
                setSheet(true);
              }}
            />
          ))}
        </div>
      </CatalogProductsState>
      <Drawer
        open={sheet}
        onOpenChange={setSheet}
        title="Pedido"
        description="Resumo rápido do rascunho"
      >
        <p className="tabular text-2xl font-extrabold">{formatBRL(totals.totalCents)}</p>
        <Button className="mt-4 w-full" size="lg" onClick={() => navigate('/atendimento/revisao')}>
          Revisar pedido
        </Button>
      </Drawer>
    </div>
  );
}

export function WaiterPizzaPage() {
  const navigate = useNavigate();
  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-extrabold">Montar pizza</h1>
      <PizzaBuilder compact onDone={() => navigate('/atendimento/revisao')} />
    </div>
  );
}

export function WaiterReviewPage() {
  const navigate = useNavigate();
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Revisão</h1>
      <OrderSummary
        compact
        confirmLabel="Enviar para cozinha"
        onConfirm={() => {
          const order = demoSession.sendToKitchen();
          if (!order) return;
          pushToast({ title: `Pedido #${order.number} na fila local`, tone: 'success' });
          navigate('/atendimento/comanda');
        }}
      />
    </div>
  );
}

export function WaiterBillPage() {
  const session = useDemoSession();
  const table =
    session.tables.find((item) => item.id === session.activeTableId) ??
    session.tables.find((item) => item.billCents > 0);
  const [people, setPeople] = useState(2);
  const total = table?.billCents ?? 0;
  const shares = total > 0 ? splitBill(total, people) : [];
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Conta</h1>
      <p className="text-sm text-muted-foreground">
        {table ? `Mesa ${String(table.number).padStart(2, '0')}` : 'Nenhuma mesa com consumo'} ·
        pagamento real não acontece aqui.
      </p>
      <p className="tabular text-4xl font-extrabold">{formatBRL(total)}</p>
      <div className="flex items-center justify-between">
        <span className="font-bold">Dividir</span>
        <QuantityInput value={people} min={1} max={8} label="pessoas" onChange={setPeople} />
      </div>
      <ul className="grid gap-2">
        {shares.map((share, index) => (
          <li
            key={index}
            className="flex justify-between rounded-[14px] bg-card px-4 py-3 font-bold shadow-card"
          >
            Pessoa {index + 1}
            <span className="tabular">{formatBRL(share)}</span>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        disabled={!table || table.status !== 'occupied'}
        onClick={() => {
          if (!table) return;
          demoSession.requestBill(table.id);
          pushToast({
            title: 'Conta marcada como aguardando',
            description: 'Nenhum pagamento foi processado.',
          });
        }}
      >
        Pedir conta
      </Button>
    </div>
  );
}
