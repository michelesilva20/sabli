import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CatalogProductsState } from '@/features/catalog/catalog-products-state';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { OrderSummary } from '@/features/ordering/order-summary';
import { useCatalogQuery } from '@/shared/api/hooks';
import { demoSession, selectOrderTotals, useDemoSession } from '@/shared/demo/session';
import { formatBRL } from '@/shared/domain/money';
import { Button } from '@/design-system/components/button';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { pushToast } from '@/design-system/components/toast';

export function PosPage() {
  const catalog = useCatalogQuery();
  const session = useDemoSession();
  const navigate = useNavigate();
  const [category, setCategory] = useState('pizzas');
  const [search, setSearch] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const categories = catalog.data?.categories ?? [];
  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (catalog.data?.products ?? []).filter((product) => {
      const inCategory = term ? true : product.categoryId === category;
      const matches = !term || product.name.toLowerCase().includes(term);
      return inCategory && matches;
    });
  }, [catalog.data?.products, category, search]);
  const activeTable = session.tables.find((table) => table.id === session.activeTableId);
  const totals = selectOrderTotals(session);
  const itemCount = session.lines.reduce((total, line) => total + line.quantity, 0);

  function sendOrder() {
    const order = demoSession.sendToKitchen();
    if (!order) return;
    setOrderOpen(false);
    pushToast({
      title: `Pedido #${order.number} enviado`,
      description: 'Demonstração local. A cozinha desta sessão foi atualizada, sem servidor.',
      tone: 'success',
    });
  }

  return (
    <div className="grid gap-5 pb-24 lg:pb-0">
      <PageHeader
        title="Novo pedido"
        description={
          activeTable
            ? `Mesa ${String(activeTable.number).padStart(2, '0')} · atendimento demonstrativo`
            : 'Balcão · selecione uma mesa no mapa se quiser vincular a conta'
        }
        actions={
          <Button variant="secondary" onClick={() => navigate('/pdv/montar-pizza')}>
            Montar pizza
          </Button>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="grid gap-4">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
          />
          {!search ? (
            <ProductCategoryTabs categories={categories} value={category} onChange={setCategory} />
          ) : null}
          <CatalogProductsState
            catalog={catalog}
            visibleCount={products.length}
            search={search}
            onClearSearch={() => setSearch('')}
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCatalogCard
                  key={product.id}
                  product={product}
                  available={session.availability[product.id] !== false}
                  onAdd={() => {
                    const added = demoSession.addProduct(product);
                    if (!added) {
                      pushToast({ title: 'Produto indisponível', tone: 'danger' });
                      return;
                    }
                    pushToast({ title: `${product.name} no pedido`, tone: 'success' });
                  }}
                />
              ))}
            </div>
          </CatalogProductsState>
        </div>
        <div className="hidden lg:block">
          <OrderSummary confirmLabel="Enviar para cozinha" onConfirm={sendOrder} />
        </div>
      </div>
      <div className="lg:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-pop">
          <div className="mx-auto flex w-full max-w-[1520px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </p>
              <p className="tabular text-lg leading-none font-extrabold">
                {formatBRL(totals.totalCents)}
              </p>
            </div>
            <Button onClick={() => setOrderOpen(true)}>Ver pedido</Button>
          </div>
        </div>
        <Sheet
          open={orderOpen}
          onOpenChange={setOrderOpen}
          side="bottom"
          title="Pedido"
          description="Rascunho local desta demonstração."
        >
          <OrderSummary compact confirmLabel="Enviar para cozinha" onConfirm={sendOrder} />
        </Sheet>
      </div>
    </div>
  );
}
